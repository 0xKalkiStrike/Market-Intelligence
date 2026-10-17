import { redirect } from "next/navigation";

export default function DoctorsRedirect() {
  redirect("/physicians");
}
