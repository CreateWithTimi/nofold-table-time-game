interface RoomCodeDisplayProps {
  code: string;
}

export function RoomCodeDisplay({ code }: RoomCodeDisplayProps) {
  return (
    <section className="room-code-display">
      <span>Room code</span>
      <strong>{code}</strong>
    </section>
  );
}
