import AuthLayout from "../components/auth/AuthLayout";
import LoginForm from "../components/auth/LoginForm";

export default function Login() {
    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Focus Better. Achieve More."
        >
            <LoginForm />
        </AuthLayout>
    );
}