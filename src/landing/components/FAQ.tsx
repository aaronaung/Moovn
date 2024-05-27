import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/src/components/ui/accordion";

interface FAQProps {
  question: string;
  answer: string;
  value: string;
}

const FAQList: FAQProps[] = [
  {
    question: "What does keep 100% mean?",
    answer: "Keep 100% means you keep all the sales revenue.",
    value: "item-1",
  },
  // {
  //   question: "What's an active class?",
  //   answer:
  //     "An active class is a class that is listed on the platform and available for purchase. You can archive classes that you no longer wish to sell to keep the active count low.",
  //   value: "item-2",
  // },
];

export const FAQ = () => {
  return (
    <section id="faq" className="container py-24 sm:py-32">
      <h2 className="mb-4 text-3xl font-bold md:text-4xl">
        Frequently Asked{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary bg-clip-text text-transparent">
          Questions
        </span>
      </h2>

      <Accordion type="single" collapsible className="AccordionRoot w-full">
        {FAQList.map(({ question, answer, value }: FAQProps) => (
          <AccordionItem key={value} value={value}>
            <AccordionTrigger className="text-left">
              {question}
            </AccordionTrigger>

            <AccordionContent>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <h3 className="mt-4 font-medium">
        Still have questions?{" "}
        <a
          href="#"
          className="border-primary text-primary transition-all hover:border-b-2"
        >
          Contact us
        </a>
      </h3>
    </section>
  );
};
