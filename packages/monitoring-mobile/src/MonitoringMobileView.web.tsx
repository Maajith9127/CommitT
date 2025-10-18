import type { MonitoringMobileViewProps } from "./MonitoringMobile.types";

export default function MonitoringMobileView(props: MonitoringMobileViewProps) {
  return (
    <div>
      <iframe
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
        src={props.url}
        style={{ flex: 1 }}
      />
    </div>
  );
}
