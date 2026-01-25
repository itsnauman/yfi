export class RingBuffer {
  private buffer: number[];
  private head: number = 0;
  private size: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(0);
  }

  push(value: number): void {
    this.buffer[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
  }

  toArray(): number[] {
    if (this.size === 0) return [];
    if (this.size < this.capacity) return this.buffer.slice(0, this.size);
    const result = new Array(this.capacity);
    for (let i = 0; i < this.capacity; i++) {
      result[i] = this.buffer[(this.head + i) % this.capacity];
    }
    return result;
  }
}
