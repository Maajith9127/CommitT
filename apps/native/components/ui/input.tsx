import { TextInput, TextInputProps } from "react-native";
import { withUniwind } from "uniwind";

const UInput = withUniwind(TextInput);

export function Input({
    className = "",
    ...props
}: TextInputProps & { className?: string }) {
    return (
        <UInput
            placeholderTextColor="#666"
            className={`w-full bg-[#1A1A1A] text-white text-xl font-semibold rounded-4xl p-4 ${className}`}
            {...props}
        />
    );
}
