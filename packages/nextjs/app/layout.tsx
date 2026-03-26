import { ScaffoldHbarAppWithProviders } from "~~/components/ScaffoldHbarAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Proof Wall",
  description: "Hedera Native Demo — timestamped proofs on HCS",
});

const ScaffoldHbarApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider enableSystem>
          <ScaffoldHbarAppWithProviders>{children}</ScaffoldHbarAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldHbarApp;
