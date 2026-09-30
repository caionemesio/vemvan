import { PRODUCT_NAME } from "@vemvan/shared";

import { Button } from "@/components/ui/button";

const stack = ["Next.js", "Tailwind CSS", "shadcn/ui"];

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-6">
      <section className="w-full max-w-md rounded-xl border bg-background p-8 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">
          Painel administrativo
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{PRODUCT_NAME}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          A fundação do painel está no ar. As funcionalidades de gestão chegam
          nas próximas entregas.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {stack.map((item) => (
            <li
              key={item}
              className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex gap-3">
          <Button>Painel em construção</Button>
          <Button variant="outline">Saiba mais</Button>
        </div>
      </section>
    </main>
  );
}
