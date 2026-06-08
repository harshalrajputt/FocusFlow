import AuthLayout from "../components/auth/AuthLayout";
import RegisterForm from "../components/auth/RegisterForm";

export default function Register() {
    return (
        <AuthLayout
            title="Create Account"
            subtitle="Start your productivity journey."
        >
            <RegisterForm />
        </AuthLayout>
    );
}