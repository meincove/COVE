'use client'

interface JoinMembershipButtonProps {
  onClick: () => void
}

export default function JoinMembershipButton({ onClick }: JoinMembershipButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-6 py-2 border rounded-md bg-black text-white hover:bg-gray-800 transition cursor-pointer"
    >
      Join Membership
    </button>
  )
}
