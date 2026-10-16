import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../../test/jsonResponse.js';
import LeadForm from './LeadForm.jsx';

const LEAD_FORM = {
  budgetOptions: ['Small', 'Large'],
  consentText: 'I agree to be contacted.',
  successMessage: 'Thanks, we will reply soon.',
};

function setup(response) {
  const turnstile = {
    render: vi.fn((_el, options) => {
      options.callback('turnstile-token');
      return 'widget-1';
    }),
    reset: vi.fn(),
  };
  vi.stubGlobal('turnstile', turnstile);
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  render(
    <MemoryRouter>
      <LeadForm leadForm={LEAD_FORM} siteKey="1x00000000000000000000AA" />
    </MemoryRouter>,
  );
  return { turnstile, fetchMock, user: userEvent.setup() };
}

async function fillValid(user) {
  await user.type(screen.getByLabelText(/Full name/), 'Asha Verma');
  await user.type(screen.getByLabelText(/Company name/), 'Example Ltd');
  await user.type(screen.getByLabelText(/Company location/), 'Indore');
  await user.type(screen.getByLabelText(/Work e-mail/), 'asha@example.com');
  await user.type(screen.getByLabelText(/Phone number/), '+91 98765 43210');
  await user.selectOptions(screen.getByLabelText(/Approximate budget/), 'Small');
  await user.type(
    screen.getByLabelText(/Tell us about your project/),
    'We need a connected metering system.',
  );
  await user.click(screen.getByLabelText(/I agree to be contacted/));
}

describe('lead form', () => {
  it('validates with the shared schema and focuses an error summary', async () => {
    const { user, fetchMock } = setup(jsonResponse({ data: {} }));
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }));
    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('Please correct');
    await waitFor(() => expect(document.activeElement).toBe(summary));
    expect(screen.getByLabelText(/Full name/)).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows inline errors on blur', async () => {
    const { user } = setup(jsonResponse({ data: {} }));
    await user.type(screen.getByLabelText(/Work e-mail/), 'not-an-email');
    await user.tab();
    expect(screen.getByLabelText(/Work e-mail/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Work e-mail/)).toHaveAccessibleDescription(/valid e-mail/i);
  });

  it('submits the visitor input with the Turnstile token and shows the success message', async () => {
    const { user, fetchMock } = setup(
      jsonResponse(
        { data: { received: true, message: 'Thanks, we will reply soon.' } },
        { status: 201 },
      ),
    );
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }));
    expect(await screen.findByRole('heading', { name: 'Thank you' })).toHaveFocus();
    expect(screen.getByText('Thanks, we will reply soon.')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/public/leads');
    expect(init.headers['X-Requested-With']).toBe('fetch');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      type: 'project_enquiry',
      email: 'asha@example.com',
      consent: true,
      budget: 'Small',
      website: '',
      turnstileToken: 'turnstile-token',
    });
    expect(body.formStartedAt).toEqual(expect.any(Number));
  });

  it('keeps the input and resets the bot check when verification fails', async () => {
    const { user, turnstile } = setup(
      jsonResponse(
        { error: { code: 'CAPTCHA_FAILED', message: 'The bot check failed.' } },
        { status: 422 },
      ),
    );
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }));
    expect(await screen.findByText(/spam check expired or failed/)).toBeInTheDocument();
    expect(turnstile.reset).toHaveBeenCalledWith('widget-1');
    expect(screen.getByLabelText(/Full name/)).toHaveValue('Asha Verma');
  });
});
