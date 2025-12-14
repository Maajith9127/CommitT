import { NativeModule, registerWebModule } from "expo";

import type { MonitoringMobileModuleEvents } from "./MonitoringMobile.types";

class MonitoringMobileModule extends NativeModule<MonitoringMobileModuleEvents> {
	PI = Math.PI;
	async setValueAsync(value: string): Promise<void> {
		this.emit("onChange", { value });
	}
	hello() {
		return "Hello world! 👋";
	}
}

export default registerWebModule(
	MonitoringMobileModule,
	"MonitoringMobileModule",
);
