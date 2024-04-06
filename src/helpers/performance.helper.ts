import { performance } from "perf_hooks";

export class PerformanceHelper {
  private marks: Record<string, number> = {};

  setMark(name: string): void {
    this.marks[name] = performance.now();
  }

  getMeasure(name: string) {
    const elapsedTime = performance.now() - this.marks[name];
    this.printLog(name, elapsedTime);
  }

  protected printLog(name: string, elapsedTime: number) {
    console.log(`# -> ${name}: ${elapsedTime.toFixed(2)} ms`);
  }
}
