import { TextInput, type TextInputProps } from "react-native";
import { withUniwind } from "uniwind";

const UInput = withUniwind(TextInput);

export function Input({
	className = "",
	...props
}: TextInputProps & { className?: string }) {
	return (
		<UInput
			placeholderTextColor="#666"
			className={`w-full rounded-4xl bg-[#1A1A1A] p-4 font-semibold text-white text-xl ${className}`}
			{...props}
		/>
	);
}
