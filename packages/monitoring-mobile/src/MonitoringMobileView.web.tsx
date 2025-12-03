import type { MonitoringMobileViewProps } from "./MonitoringMobile.types";

export default function MonitoringMobileView(props: MonitoringMobileViewProps) {
	return (
		<div>
			<iframe
				style={{ flex: 1 }}
				src={props.url}
				onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
			/>
		</div>
	);
}
