import { leadSubmissionSchema } from '@bitbyte/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { cx } from '../../components/ui/cx.js';
import { ApiError, apiRequest } from '../../services/api/client.js';
import { loadTurnstile } from './turnstile.js';

/** Fields of the PROVISIONAL contact form (D-053), in display order. */
const FIELDS = [
  { name: 'fullName', label: 'Full name', autoComplete: 'name' },
  { name: 'companyName', label: 'Company name', autoComplete: 'organization' },
  { name: 'companyLocation', label: 'Company location', autoComplete: 'address-level2' },
  { name: 'email', label: 'Work e-mail address', type: 'email', autoComplete: 'email' },
  { name: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'tel' },
];
const MESSAGE_MAX = 5000;
const EMPTY = {
  fullName: '',
  companyName: '',
  companyLocation: '',
  email: '',
  phone: '',
  budget: '',
  message: '',
  consent: false,
};
const INPUT =
  'block w-full rounded-sm border border-border-strong bg-surface px-3.5 py-2.5 text-fg placeholder:text-fg-subtle aria-invalid:border-danger-600';

function fieldError(name, value) {
  const schema = leadSubmissionSchema.shape[name];
  const result = schema?.safeParse(value);
  return result && !result.success ? (result.error.issues[0]?.message ?? 'Check this field') : null;
}

function Field({ id, label, error, help, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium text-fg">
        {label}
        <span aria-hidden="true" className="text-danger-600">
          {' '}
          *
        </span>
        <span className="sr-only"> (required)</span>
      </label>
      {children}
      {help && !error && (
        <p id={`${id}-help`} className="text-small text-fg-subtle">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-small font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Project enquiry form (§9.7). Validates with the same zod schema as the server, shows inline
 * errors on blur and an error summary on submit, keeps the visitor's input on every failure,
 * and sends the Turnstile token for server-side verification (D-020).
 */
export default function LeadForm({ leadForm, siteKey }) {
  const uid = useId();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [token, setToken] = useState('');
  const startedAt = useRef(0);
  const widgetRef = useRef(null);
  const widgetId = useRef(null);
  const summaryRef = useRef(null);
  const successRef = useRef(null);
  const honeypotRef = useRef(null);

  useEffect(() => {
    // Fill time is measured from when the form appeared (spam signal, D-051).
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !widgetRef.current || widgetId.current !== null) return;
        widgetId.current = turnstile.render(widgetRef.current, {
          sitekey: siteKey,
          action: 'lead',
          callback: (value) => setToken(value),
          'expired-callback': () => setToken(''),
          'error-callback': () => setToken(''),
        });
      })
      .catch(() => {
        if (!cancelled)
          setFormError('The spam check could not be loaded. Please reload the page and try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
  }, [status]);

  const id = (name) => `${uid}-${name}`;
  const set = (name, value) => setValues((current) => ({ ...current, [name]: value }));
  const blur = (name) =>
    setErrors((current) => ({ ...current, [name]: fieldError(name, values[name]) }));
  const resetWidget = () => {
    setToken('');
    if (widgetId.current !== null) window.turnstile?.reset(widgetId.current);
  };

  async function onSubmit(event) {
    event.preventDefault();
    setFormError(null);
    const payload = {
      type: 'project_enquiry',
      ...values,
      website: honeypotRef.current?.value ?? '',
      sourcePath: window.location.pathname,
      formStartedAt: startedAt.current,
      turnstileToken: token,
    };
    const result = leadSubmissionSchema.safeParse(payload);
    const next = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const name = issue.path[0];
        if (name !== 'turnstileToken' && !next[name]) next[name] = issue.message;
      }
    }
    if (!(leadForm.budgetOptions ?? []).includes(values.budget))
      next.budget = 'Choose one of the options';
    if (!token) next.turnstile = 'Please complete the spam check';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setStatus('submitting');
    try {
      const response = await apiRequest('/public/leads', { method: 'POST', body: result.data });
      setSuccessMessage(response?.data?.message ?? leadForm.successMessage);
      setStatus('success');
    } catch (err) {
      setStatus('idle');
      resetWidget();
      if (
        err instanceof ApiError &&
        err.code === 'VALIDATION_ERROR' &&
        Array.isArray(err.details)
      ) {
        const serverErrors = {};
        for (const detail of err.details) {
          const name = String(detail.path ?? '').replace(/^body\./, '');
          if (name && !serverErrors[name]) serverErrors[name] = detail.message;
        }
        setErrors(serverErrors);
        requestAnimationFrame(() => summaryRef.current?.focus());
      } else if (err instanceof ApiError && err.code === 'CAPTCHA_FAILED') {
        setFormError('The spam check expired or failed. Please complete it again and resubmit.');
      } else if (err instanceof ApiError && err.status === 429) {
        setFormError('Too many enquiries were sent from your connection. Please try again later.');
      } else if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
        setFormError(
          'Your enquiry could not be sent because the connection failed. Your details are still here; please try again.',
        );
      } else {
        setFormError(
          'Your enquiry could not be sent right now. Your details are still here; please try again in a moment.',
        );
      }
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col gap-3" role="status">
        <h3 ref={successRef} tabIndex={-1} className="text-h3 font-bold outline-none">
          Thank you
        </h3>
        <p className="text-fg-muted">{successMessage}</p>
      </div>
    );
  }

  const summary = Object.entries(errors).filter(([, message]) => message);
  const described = (name) =>
    cx(
      errors[name] && `${id(name)}-error`,
      name === 'message' && !errors[name] && `${id(name)}-help`,
    ) || undefined;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-busy={status === 'submitting'}
      className="flex flex-col gap-5"
    >
      {summary.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border-2 border-danger-600 p-4 outline-none"
        >
          <p className="font-semibold text-fg">
            Please correct {summary.length === 1 ? '1 field' : `${summary.length} fields`}:
          </p>
          <ul className="mt-2 list-disc pl-5 text-small">
            {summary.map(([name, message]) => (
              <li key={name}>
                <a
                  href={`#${id(name === 'turnstile' ? 'turnstile' : name)}`}
                  className="link-inline text-danger-600"
                >
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {formError && (
        <p role="alert" className="rounded-md bg-neutral-100 p-4 text-fg">
          {formError}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <Field
            key={field.name}
            id={id(field.name)}
            label={field.label}
            error={errors[field.name]}
          >
            <input
              id={id(field.name)}
              name={field.name}
              type={field.type ?? 'text'}
              autoComplete={field.autoComplete}
              required
              aria-invalid={Boolean(errors[field.name])}
              aria-describedby={described(field.name)}
              value={values[field.name]}
              onChange={(event) => set(field.name, event.target.value)}
              onBlur={() => blur(field.name)}
              className={INPUT}
            />
          </Field>
        ))}
        <Field id={id('budget')} label="Approximate budget" error={errors.budget}>
          <select
            id={id('budget')}
            name="budget"
            required
            aria-invalid={Boolean(errors.budget)}
            aria-describedby={described('budget')}
            value={values.budget}
            onChange={(event) => set('budget', event.target.value)}
            className={INPUT}
          >
            <option value="">Choose…</option>
            {(leadForm.budgetOptions ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id={id('message')}
        label="Tell us about your project"
        error={errors.message}
        help={`${values.message.length} / ${MESSAGE_MAX} characters`}
      >
        <textarea
          id={id('message')}
          name="message"
          rows={6}
          required
          maxLength={MESSAGE_MAX}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={described('message')}
          value={values.message}
          onChange={(event) => set('message', event.target.value)}
          onBlur={() => blur('message')}
          className={INPUT}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-3">
          <input
            id={id('consent')}
            name="consent"
            type="checkbox"
            required
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? `${id('consent')}-error` : undefined}
            checked={values.consent}
            onChange={(event) => set('consent', event.target.checked)}
            className="mt-1 size-5 shrink-0 accent-accent-600"
          />
          <label htmlFor={id('consent')} className="text-small text-fg-body">
            {leadForm.consentText}
            <span className="sr-only"> (required)</span>
          </label>
        </div>
        {errors.consent && (
          <p id={`${id('consent')}-error`} className="text-small font-medium text-danger-600">
            {errors.consent}
          </p>
        )}
      </div>

      {/* Honeypot: invisible to people and assistive technology; bots that fill it are filtered. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id('website')}>Leave this field empty</label>
        <input
          ref={honeypotRef}
          id={id('website')}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div id={id('turnstile')} tabIndex={-1} className="flex flex-col gap-1.5 outline-none">
        <div ref={widgetRef} className="min-h-[65px]" />
        {errors.turnstile && (
          <p className="text-small font-medium text-danger-600">{errors.turnstile}</p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={status === 'submitting'}
        className="self-start"
        arrow
      >
        {status === 'submitting' ? 'Sending…' : 'Send enquiry'}
      </Button>
    </form>
  );
}
