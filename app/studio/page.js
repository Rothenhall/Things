import Studio from '../Studio';
import JsonLd from '../JsonLd';

export const metadata = { title: 'Studio | Things by Rothenhall' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <>
      <JsonLd path="/studio" />
      <Studio />
    </>
  );
}
