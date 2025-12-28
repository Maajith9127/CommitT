export type AuthMode = "signin" | "signup";

export type AuthFormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};
