import { notFound } from "next/navigation";

import { RegisterForm } from "@/components/register-form";
import { fetchDemoContent } from "@/lib/demo-content";

type RegisterPageContent = {
  title: string;
  subtitle: string;
  steps: Array<{ title: string; description: string }>;
  form: {
    defaultStake: number;
    minimumStake: number;
    stakeLabel: string;
    stakeUnit: string;
    approveLabel: string;
    registerLabel: string;
  };
};

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const content = await fetchDemoContent<RegisterPageContent>("register_page");

  if (!content) {
    notFound();
  }

  return (
    <>
      <header>
        <h1 className="text-balance text-3xl font-semibold leading-tight">{content.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {content.subtitle}
        </p>
      </header>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <h2 className="text-xl font-semibold">How it works</h2>
          <div className="mt-6 flex flex-col gap-5">
            {content.steps.map((step, index) => (
              <div key={step.title} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-medium">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <RegisterForm form={content.form} />
      </section>
    </>
  );
}
