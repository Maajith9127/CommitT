import { GoogleSignin } from "@react-native-google-signin/google-signin";

export function configureGoogleSignIn() {
	GoogleSignin.configure({
		androidClientId:
			"264657416758-vmgbflevqek2pntugveotravhjv905k.apps.googleusercontent.com",
		webClientId:
			"264657416758-cvnamsspk9hsfiq1qat9mu7hv8rsokbb.apps.googleusercontent.com",
		offlineAccess: true,
		forceCodeForRefreshToken: false,
	});
}
