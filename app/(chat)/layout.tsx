import { TooltipProvider } from "@/components/ui/tooltip";
import { PhoneFrame } from "@/components/app/phone-frame";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <PhoneFrame>{children}</PhoneFrame>
    </TooltipProvider>
  );
}
