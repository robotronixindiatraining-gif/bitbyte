import { Component } from 'react';
import { Section } from '../components/ui/Section.jsx';
import { CtaBannerSection } from './CtaBannerSection.jsx';
import { ClientLogosSection } from './ClientLogosSection.jsx';
import { ContactFormSection } from './ContactFormSection.jsx';
import { EngagementModelsSection } from './EngagementModelsSection.jsx';
import { FaqSection } from './FaqSection.jsx';
import { FeatureListSection } from './FeatureListSection.jsx';
import { HeroSection } from './HeroSection.jsx';
import { JobListSection } from './JobListSection.jsx';
import { ProcessStepsSection } from './ProcessStepsSection.jsx';
import { ProjectShowcaseSection } from './ProjectShowcaseSection.jsx';
import { RichTextSection } from './RichTextSection.jsx';
import { ServiceGridSection } from './ServiceGridSection.jsx';
import { SplitContentSection } from './SplitContentSection.jsx';
import { StatsSection } from './StatsSection.jsx';
import { TestimonialsSection } from './TestimonialsSection.jsx';

/**
 * Renderers for the 15 approved section types (shared/src/content/sections.js, D-008). The data
 * shape is the PUBLIC resolver's output (server/src/services/resolver.js): references are
 * already resolved to published items, and rich text is already sanitised server-side.
 */
export const SECTION_COMPONENTS = Object.freeze({
  hero: HeroSection,
  richText: RichTextSection,
  serviceGrid: ServiceGridSection,
  projectShowcase: ProjectShowcaseSection,
  testimonials: TestimonialsSection,
  stats: StatsSection,
  featureList: FeatureListSection,
  processSteps: ProcessStepsSection,
  splitContent: SplitContentSection,
  ctaBanner: CtaBannerSection,
  faq: FaqSection,
  engagementModels: EngagementModelsSection,
  contactForm: ContactFormSection,
  jobList: JobListSection,
  clientLogos: ClientLogosSection,
});

const has = (list) => Array.isArray(list) && list.length > 0;

/**
 * Sections without real content are hidden rather than padded (§1.2): e.g. a testimonials
 * section stays invisible until a consented testimonial is published.
 */
export function hasContent(type, data = {}) {
  switch (type) {
    case 'hero':
      return Boolean(data.heading);
    case 'richText':
      return Boolean(data.body);
    case 'serviceGrid':
    case 'projectShowcase':
    case 'testimonials':
      return has(data.items);
    case 'stats':
    case 'featureList':
    case 'faq':
      return has(data.items);
    case 'processSteps':
      return has(data.steps);
    case 'engagementModels':
      return has(data.models);
    case 'clientLogos':
      return has(data.logos);
    case 'splitContent':
    case 'ctaBanner':
      return Boolean(data.heading);
    case 'contactForm':
    case 'jobList':
      return true;
    default:
      return false;
  }
}

/** Catches a rendering failure in ONE section so the rest of the page still works. */
class SectionBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error(`Section "${this.props.sectionKey}" failed to render`, error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function UnknownSection({ section }) {
  // Visible during development only; production renders nothing for an unknown type.
  if (!import.meta.env.DEV) return null;
  console.warn(`Unknown section type "${section.type}" (key "${section.key}")`);
  return (
    <div className="container-site py-6">
      <p
        role="note"
        className="rounded-md border-2 border-dashed border-danger-600 p-4 font-mono text-small text-danger-600"
      >
        Unsupported section type “{String(section.type)}” (key {String(section.key)}) — not rendered
        in production.
      </p>
    </div>
  );
}

/** Renders one published section with its surface and spacing variant. */
export function SectionView({ section, index = 0, headingLevel = 2 }) {
  const Renderer = SECTION_COMPONENTS[section?.type];
  if (!Renderer) return <UnknownSection section={section ?? {}} />;
  const data = section.data ?? {};
  if (!hasContent(section.type, data)) return null;
  const background = section.variant?.background ?? (section.type === 'hero' ? 'dark' : 'light');
  const spacing = section.variant?.spacing ?? 'default';
  const headingId = `section-${section.key}-heading`;
  const isHero = section.type === 'hero';
  return (
    <SectionBoundary sectionKey={section.key}>
      <Section
        id={section.anchorId ?? undefined}
        background={background}
        spacing={isHero ? 'none' : spacing}
        aria-labelledby={data.heading ? headingId : undefined}
        data-section-type={section.type}
      >
        <Renderer
          data={data}
          background={background}
          spacing={spacing}
          headingId={headingId}
          level={isHero && index === 0 ? 1 : headingLevel}
          isFirst={index === 0}
        />
      </Section>
    </SectionBoundary>
  );
}

export function SectionList({ sections = [] }) {
  return sections.map((section, index) => (
    <SectionView key={section?.key ?? index} section={section} index={index} />
  ));
}
