import { SubredditInfo, SubredditPost } from './reddit';
import { AnalysisResult, AnalysisProgress } from './analysis';

interface WorkerMessage {
  type: 'progress' | 'basicAnalysis' | 'complete' | 'error';
  analysisId: string;
  data?: AnalysisProgress | AnalysisResult;
  error?: string;
}

class AnalysisWorkerService {
  private sharedWorker: SharedWorker | null = null;
  private analysisCallbacks: Map<string, {
    onProgress: (progress: AnalysisProgress) => void;
    onBasicAnalysis?: (result: AnalysisResult) => void;
    onComplete: (result: AnalysisResult) => void;
    onError: (error: string) => void;
  }> = new Map();

  public isAnalyzing(): boolean {
    return this.analysisCallbacks.size > 0;
  }

  public getCurrentAnalysisId(): string | null {
    return this.analysisCallbacks.size > 0 ? Array.from(this.analysisCallbacks.keys())[0] : null;
  }

  private initWorker() {
    if (this.sharedWorker) return;

    // In development, Vite serves the worker directly
    // In production, it's served from the built assets
    const workerUrl = import.meta.env.DEV
      ? new URL('./analysisSharedWorker.ts', import.meta.url)
      : new URL('/src/lib/analysisSharedWorker.js', window.location.origin);

    try {
      this.sharedWorker = new SharedWorker(workerUrl, {
        type: 'module',
        name: 'analysis-worker'
      });

      this.sharedWorker.port.start();

      this.sharedWorker.port.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const { type, analysisId, data, error } = e.data;
        const callbacks = this.analysisCallbacks.get(analysisId);
        
        if (!callbacks) return;

        switch (type) {
          case 'progress':
            callbacks.onProgress(data as AnalysisProgress);
            break;
          case 'basicAnalysis':
            callbacks.onBasicAnalysis?.(data as AnalysisResult);
            break;
          case 'complete':
            callbacks.onComplete(data as AnalysisResult);
            this.analysisCallbacks.delete(analysisId);
            break;
          case 'error':
            callbacks.onError(error || 'Unknown error');
            this.analysisCallbacks.delete(analysisId);
            break;
        }
      };

      this.sharedWorker.onerror = (error) => {
        console.error('SharedWorker error:', error);
        this.analysisCallbacks.forEach(callbacks => {
          callbacks.onError('Worker error: ' + error.message);
        });
        this.analysisCallbacks.clear();
      };
    } catch (err) {
      console.error('Failed to initialize SharedWorker:', err);
      throw new Error('Failed to initialize shared worker: ' + (err as Error).message);
    }
  }

  public analyze(
    info: SubredditInfo,
    posts: SubredditPost[],
    onProgress: (progress: AnalysisProgress) => void,
    onBasicAnalysis?: (result: AnalysisResult) => void
  ): Promise<AnalysisResult> {
    // If there's an ongoing analysis, don't start a new one
    if (this.isAnalyzing()) {
      throw new Error('An analysis is already in progress');
    }

    if (!this.sharedWorker) {
      this.initWorker();
    }

    if (!this.sharedWorker) {
      throw new Error('Failed to initialize shared worker');
    }

    return new Promise((resolve, reject) => {
      const analysisId = crypto.randomUUID();
      
      this.analysisCallbacks.set(analysisId, {
        onProgress,
        onBasicAnalysis,
        onComplete: resolve,
        onError: reject
      });

      this.sharedWorker!.port.postMessage({
        info,
        posts,
        analysisId
      });
    });
  }

  public cancelCurrentAnalysis() {
    const currentAnalysisId = this.getCurrentAnalysisId();
    if (currentAnalysisId) {
      const callbacks = this.analysisCallbacks.get(currentAnalysisId);
      if (callbacks) {
        callbacks.onError('Analysis cancelled');
        this.analysisCallbacks.delete(currentAnalysisId);
      }
    }
  }

  public terminate() {
    if (this.sharedWorker) {
      this.sharedWorker.port.close();
      this.sharedWorker = null;
    }
    this.analysisCallbacks.clear();
  }
}

// Export persistent singleton instance
declare global {
  interface Window {
    _globalAnalysisWorker?: AnalysisWorkerService;
  }
}

export const analysisWorker = window._globalAnalysisWorker || new AnalysisWorkerService();
window._globalAnalysisWorker = analysisWorker; 