import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Finance App — Finanças do Casal',
  description: 'Gestão de finanças pessoais compartilhadas para casais.',
};

export default function Home() {
  redirect('/dashboard');
}
