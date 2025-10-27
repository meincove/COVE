// cove-frontend/src/app/payment/result/page.tsx
import Link from "next/link";

export default function PaymentResult({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams?.session_id ?? "";

  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-black p-6">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold">Payment complete 🎉</h1>
        <p className="mt-2 text-gray-700">
          Thank you! Your payment has been processed.
        </p>

        {sessionId ? (
          <p className="mt-2 text-sm text-gray-500">
            Stripe session: <code>{sessionId}</code>
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/checkout" className="px-4 py-2 rounded-full border border-gray-300">
            Back to Checkout
          </Link>
          <Link href="/orders" className="px-4 py-2 rounded-full bg-black text-white">
            View My Orders
          </Link>
        </div>
      </div>
    </main>
  );
}
