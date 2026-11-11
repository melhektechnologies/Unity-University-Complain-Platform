import Image from 'next/image';

const UNITY_SEAL_URL =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/photo_2023-08-29_18-31-39-EXL0jJY3h83oABrMLKkDoK9ogk6RYP.jpg';

export function UnitySeal({ size = 48 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-university-gold bg-white p-0.5 shadow-sm"
      style={{ width: size, height: size }}
    >
      <Image
        src={UNITY_SEAL_URL}
        alt="Unity University seal"
        width={size}
        height={size}
        sizes={`${size}px`}
        priority
        className="size-full rounded-full object-contain"
      />
    </span>
  );
}
