import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { BrandLink } from "@/components/brand";
import { getSession } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-14 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <BrandLink />
          <div className="mt-10">{children}</div>
        </div>
      </div>
      <div className="grid-bg hidden border-l border-[#171b24] lg:flex lg:flex-col lg:justify-center lg:px-16">
        <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
          Da ideia ao produto.
          <br />
          Do produto às vendas.
        </h2>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-[#a5adbd]">
          A INFORA organiza todo o caminho: pesquisa, estratégia, criação, design, produto, página de vendas, marketing e
          analytics — em um único workspace.
        </p>
        <ul className="mt-8 space-y-3 text-xs text-[#c5cbd7]">
          {["Blueprint de produto gerado por IA", "Editor com autosave e versões", "Página de vendas pública com eventos reais", "Consumo de créditos transparente"].map(
            (i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#8b5cf6]" />
                {i}
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
