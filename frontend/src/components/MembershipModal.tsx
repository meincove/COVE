'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

type Perk = 'Free Delivery' | 'Exclusive Deals' | 'Personalization Options'

interface MembershipModalProps {
  isOpen: boolean
  onClose: () => void
}

const tiers: {
  name: string
  perks: Record<Perk, boolean>
}[] = [
  {
    name: 'Gold',
    perks: {
      'Free Delivery': true,
      'Exclusive Deals': false,
      'Personalization Options': false,
    },
  },
  {
    name: 'Partner',
    perks: {
      'Free Delivery': true,
      'Exclusive Deals': true,
      'Personalization Options': false,
    },
  },
  {
    name: 'Family',
    perks: {
      'Free Delivery': true,
      'Exclusive Deals': true,
      'Personalization Options': true,
    },
  },
]

const perkList: Perk[] = [
  'Free Delivery',
  'Exclusive Deals',
  'Personalization Options',
]

export default function MembershipModal({ isOpen, onClose }: MembershipModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white text-black rounded-xl w-full max-w-3xl max-h-[85vh] p-6 pb-12 shadow-xl overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold tracking-wide">Choose Your Membership</h2>
              <button onClick={onClose}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 border-b">Perks</th>
                    {tiers.map((tier) => (
                      <th key={tier.name} className="p-3 border-b text-center text-lg font-medium">
                        {tier.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perkList.map((perk) => (
                    <tr key={perk} className="border-t">
                      <td className="p-3 font-medium">{perk}</td>
                      {tiers.map((tier) => (
                        <td key={tier.name} className="p-3 text-center">
                          {tier.perks[perk] ? '✅' : '❌'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
