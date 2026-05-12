const corner = (
  <svg viewBox="0 0 54 54">
    <path d="M4 4h46v5H9v45H4z" fill="#c8922a" opacity=".55" />
    <circle cx="7" cy="7" r="2.5" fill="#c8922a" opacity=".7" />
    <path d="M17 4Q17 17 4 17" stroke="#c8922a" strokeWidth=".8" fill="none" opacity=".4" />
  </svg>
);

export default function CornerFrame() {
  return (
    <>
      <div className="fixed inset-[5px] border border-accent-gold/40 pointer-events-none z-[499]" />
      <span className="fixed w-[54px] h-[54px] pointer-events-none z-[500] top-[5px] left-[5px]">{corner}</span>
      <span className="fixed w-[54px] h-[54px] pointer-events-none z-[500] top-[5px] right-[5px] scale-x-[-1]">{corner}</span>
      <span className="fixed w-[54px] h-[54px] pointer-events-none z-[500] bottom-[5px] left-[5px] scale-y-[-1]">{corner}</span>
      <span className="fixed w-[54px] h-[54px] pointer-events-none z-[500] bottom-[5px] right-[5px] scale-[-1]">{corner}</span>
    </>
  );
}
