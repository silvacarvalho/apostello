import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirecionar para login
  redirect("/auth/login");
}
