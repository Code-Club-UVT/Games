export function LightRow({ litCount, total }: { litCount: number; total: number }) {
  return (
    <div className="flex gap-4 sm:gap-6">
      {Array.from({ length: total }, (_, index) => {
        const isLit = index < litCount
        return (
          <div
            key={index}
            className={`h-14 w-14 rounded-full border-4 transition-colors duration-150 sm:h-20 sm:w-20 ${
              isLit
                ? 'border-cherry bg-cherry shadow-[0_0_30px_8px_rgba(218,49,95,0.6)]'
                : 'border-dusk bg-dusk'
            }`}
          />
        )
      })}
    </div>
  )
}
