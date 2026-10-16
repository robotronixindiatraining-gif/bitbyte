import { ResponsiveImage } from '../components/ui/ResponsiveImage.jsx';
import { Container } from '../components/ui/Section.jsx';
import { SmartLink } from '../components/ui/SmartLink.jsx';
import { Heading } from '../components/ui/Typography.jsx';

/** Client logos (§9.5): monochrome until hover; only logos the CMS publishes (with permission). */
export function ClientLogosSection({ data, level, headingId }) {
  return (
    <Container className="flex flex-col gap-10">
      {data.heading && (
        <Heading level={level} id={headingId} size="h3" className="text-center">
          {data.heading}
        </Heading>
      )}
      <ul role="list" className="grid grid-cols-2 items-center gap-6 sm:grid-cols-3 lg:grid-cols-6">
        {(data.logos ?? []).map((logo, index) => {
          const image = (
            <ResponsiveImage
              image={{ ...logo.image, alt: logo.name, decorative: false }}
              sizes="160px"
              className="mx-auto h-12 w-full max-w-40 bg-transparent!"
              imgClassName="object-contain grayscale opacity-70 transition duration-200 hover:grayscale-0 hover:opacity-100"
            />
          );
          return (
            <li key={`${logo.name}-${index}`} className="flex items-center justify-center">
              {logo.url ? (
                <SmartLink href={logo.url} openInNewTab className="block w-full rounded-md p-2">
                  {image}
                </SmartLink>
              ) : (
                image
              )}
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
