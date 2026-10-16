import { cx } from '../components/ui/cx.js';
import { Container } from '../components/ui/Section.jsx';
import { Heading } from '../components/ui/Typography.jsx';

/**
 * Rich text (§9.5). The HTML was sanitised by the server when it was saved (allowlisted tags,
 * safe links only, Stage 05) and is only ever rendered from the published API.
 */
export function RichTextSection({ data, level, headingId }) {
  return (
    <Container>
      <div className={cx('mx-auto', data.width === 'wide' ? 'max-w-4xl' : 'max-w-[68ch]')}>
        {data.heading && (
          <Heading level={level} id={headingId} className="mb-8">
            {data.heading}
          </Heading>
        )}
        <div
          className={cx('prose-site', data.width === 'wide' && 'max-w-none')}
          dangerouslySetInnerHTML={{ __html: data.body }}
        />
      </div>
    </Container>
  );
}
