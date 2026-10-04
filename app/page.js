import Landing from './Landing';
import JsonLd from './JsonLd';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <>
      <JsonLd path="/" />
      <Landing />
    </>
  );
}
