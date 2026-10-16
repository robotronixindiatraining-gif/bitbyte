import { Button } from '../components/ui/Button.jsx';
import { BitGrid } from '../components/ui/BitGrid.jsx';
import { Container, Section } from '../components/ui/Section.jsx';
import { Eyebrow } from '../components/ui/Typography.jsx';
import { useDocumentTitle } from '../features/content/useDocumentTitle.js';

const NOT_FOUND = ['00110100', '00110000', '00110100']; // ASCII "4", "0", "4"

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <Section background="muted">
      <Container className="flex flex-col items-start gap-6 py-10">
        <BitGrid pattern={NOT_FOUND} cell={12} gap={6} />
        <Eyebrow>Error 404</Eyebrow>
        <h1 className="text-h1 font-extrabold">Page not found</h1>
        <p className="max-w-[52ch] text-lead text-fg-muted">
          The page you are looking for does not exist or is no longer available.
        </p>
        <Button href="/" arrow>
          Go to the homepage
        </Button>
      </Container>
    </Section>
  );
}
