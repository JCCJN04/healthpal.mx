import type { PublicDoctor, PublicDoctorEnriched } from '@/shared/lib/queries/publicDoctors';
import { formatSpecialty } from '@/shared/lib/specialties';

const SITE_URL = 'https://healthpal.mx';

// ─── Physician (individual doctor profile) ─────────────────────────────────

export function buildPhysicianJsonLd(doctor: PublicDoctor | PublicDoctorEnriched): string {
  const specialty = formatSpecialty(doctor.specialty);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: doctor.display_name,
    url: `${SITE_URL}/directorio/${doctor.slug}`,
    description:
      doctor.bio ??
      `${doctor.display_name}, ${specialty} en ${doctor.city ?? 'México'}. Agenda tu cita en HealthPal.mx`,
    medicalSpecialty: specialty,
  };

  if (doctor.avatar_url) {
    schema.image = doctor.avatar_url;
  }

  if (doctor.address_text || doctor.city) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: doctor.address_text ?? undefined,
      addressLocality: doctor.city ?? undefined,
      addressCountry: 'MX',
    };
  }

  if (doctor.location) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: doctor.location.lat,
      longitude: doctor.location.lng,
    };
  }

  if (doctor.consultation_price) {
    schema.priceRange = `$${doctor.consultation_price.toLocaleString('es-MX')} MXN`;
  }

  if (doctor.avg_rating > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: doctor.avg_rating.toFixed(1),
      bestRating: '5',
      worstRating: '1',
      reviewCount: String(doctor.review_count),
    };
  }

  if (doctor.clinic_name) {
    schema.worksFor = {
      '@type': 'MedicalClinic',
      name: doctor.clinic_name,
    };
  }

  if (doctor.accepts_video) {
    schema.availableService = {
      '@type': 'MedicalProcedure',
      name: 'Videoconsulta',
    };
  }

  return JSON.stringify(schema);
}

// ─── ItemList (directory / SEO landing page) ────────────────────────────────

export function buildDoctorListJsonLd(
  doctors: PublicDoctor[],
  listName: string,
  listUrl: string,
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    url: `${SITE_URL}${listUrl}`,
    numberOfItems: doctors.length,
    itemListElement: doctors.map((doc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/directorio/${doc.slug}`,
      item: {
        '@type': 'Physician',
        name: doc.display_name,
        medicalSpecialty: formatSpecialty(doc.specialty),
        ...(doc.avg_rating > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: doc.avg_rating.toFixed(1),
                bestRating: '5',
                reviewCount: String(doc.review_count),
              },
            }
          : {}),
        ...(doc.avatar_url ? { image: doc.avatar_url } : {}),
        ...(doc.address_text
          ? {
              address: {
                '@type': 'PostalAddress',
                streetAddress: doc.address_text,
                addressLocality: doc.city ?? undefined,
                addressCountry: 'MX',
              },
            }
          : {}),
      },
    })),
  };

  return JSON.stringify(schema);
}

// ─── BreadcrumbList ─────────────────────────────────────────────────────────

export function buildBreadcrumbJsonLd(
  items: { name: string; url: string }[],
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };

  return JSON.stringify(schema);
}
