import { Component } from 'react';
import { Container, Section } from '../components/ui/Section.jsx';

/** Last-resort boundary: a calm message, details to the console only (never to the page). */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error(error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Section background="muted">
        <Container className="flex flex-col gap-4 py-10">
          <h1 className="text-h2 font-bold">Something went wrong</h1>
          <p className="text-fg-muted">
            Please reload the page. If the problem continues, try again later.
          </p>
        </Container>
      </Section>
    );
  }
}
