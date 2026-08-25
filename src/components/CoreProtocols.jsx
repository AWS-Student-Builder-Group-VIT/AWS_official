import SectionHeading from './SectionHeading';
import EventTimeline from './EventTimeline';

export default function CoreProtocols() {
  return (
    <section
      className="bg-background relative"
      id="features"
    >
      {/* Section heading sits above the helix scroll zone */}
      <div className="w-full px-container-padding pt-24 pb-8">
        <SectionHeading icon="developer_board" title="Events" />
      </div>

      {/* AWS Week Event Timeline — uses sticky scroll internally */}
      <EventTimeline />
    </section>
  );
}
