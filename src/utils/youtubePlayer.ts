import YouTubePlayer from 'youtube-player';

export class YouTubeAudio {
  player: any = null;
  _volume: number = 1;
  _loop: boolean = false;
  _currentTime: number = 0;
  id: string;
  paused: boolean = true;
  element: HTMLDivElement;
  startTime: number = 0;
  endTime: number = 0;
  onEndedCallback: (() => void) | null = null;
  private checkInterval: any = null;
  private isPrewarmed: boolean = false;

  constructor(videoId: string) {
    this.id = videoId;
    this.element = document.createElement('div');
    // Offscreen positioning so the browser treats the iframe as visible/active
    this.element.style.position = 'absolute';
    this.element.style.width = '1px';
    this.element.style.height = '1px';
    this.element.style.top = '-9999px';
    this.element.style.left = '-9999px';
    this.element.style.opacity = '0.01';
    this.element.style.pointerEvents = 'none';
    document.body.appendChild(this.element);

    this.player = YouTubePlayer(this.element, {
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1
      }
    });

    this.player.on('ready', () => {
      if (this._volume !== undefined && this.player.setVolume) {
        this.player.setVolume(Math.min(100, Math.max(0, Math.round(this._volume * 100)))).catch(() => {});
      }
      this.prewarm();
    });

    this.player.on('stateChange', (event: any) => {
      if (event.data === 1) { // Playing
        this.paused = false;
        this.startChecking();
      } else if (event.data === 2 || event.data === 0) { // Paused or Ended
        this.paused = true;
        this.stopChecking();
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
        if (event.data === 0 && this._loop) {
          this.play();
        }
      }
    });
  }

  // Pre-warms YouTube player stream buffer
  prewarm() {
    if (this.isPrewarmed || !this.player) return;
    this.isPrewarmed = true;
    try {
      if (typeof this.player.mute === 'function') this.player.mute().catch(() => {});
      if (typeof this.player.playVideo === 'function') {
        const p = this.player.playVideo();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            setTimeout(() => {
              if (this.paused && this.player && typeof this.player.pauseVideo === 'function') {
                this.player.pauseVideo().catch(() => {});
                if (typeof this.player.unMute === 'function') this.player.unMute().catch(() => {});
                if (typeof this.player.seekTo === 'function') {
                  this.player.seekTo(this.startTime || 0, true).catch(() => {});
                }
              }
            }, 100);
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }

  private startChecking() {
    this.stopChecking();
    this.checkInterval = setInterval(async () => {
      if (this.endTime > 0) {
        try {
          const current = await this.player.getCurrentTime();
          if (current >= this.endTime) {
            if (this._loop) {
              this.play();
            } else {
              this.pause();
            }
          }
        } catch (e) {}
      }
    }, 200);
  }

  private stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async getDuration(): Promise<number> {
    try {
      if (this.player && typeof this.player.getDuration === 'function') {
        const d = await this.player.getDuration();
        if (typeof d === 'number' && !isNaN(d) && d > 0) {
          return d;
        }
      }
    } catch (e) {}
    return 0;
  }

  play() {
    this.paused = false;
    if (!this.player) return;

    const targetTime = this.startTime > 0 ? this.startTime : 0;
    const vol = Math.min(100, Math.max(0, Math.round(this._volume * 100)));

    try {
      if (typeof this.player.unMute === 'function') this.player.unMute().catch(() => {});
      if (typeof this.player.setVolume === 'function') this.player.setVolume(vol).catch(() => {});
      if (typeof this.player.seekTo === 'function') this.player.seekTo(targetTime, true).catch(() => {});
      if (typeof this.player.playVideo === 'function') this.player.playVideo().catch(() => {});
    } catch (e) {}
  }

  pause() {
    this.paused = true;
    if (this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo().catch(() => {});
      } catch (e) {}
    }
    this.stopChecking();
    if (this.onEndedCallback) {
      this.onEndedCallback();
    }
  }

  cloneNode() {
    const clone = new YouTubeAudio(this.id);
    clone.startTime = this.startTime;
    clone.endTime = this.endTime;
    clone.volume = this.volume;
    return clone;
  }

  get volume() { return this._volume; }
  set volume(vol: number) {
    this._volume = vol;
    if (this.player && this.player.setVolume) {
      this.player.setVolume(Math.min(100, Math.max(0, Math.round(vol * 100)))).catch(() => {});
    }
  }

  get currentTime() { return this._currentTime; }
  set currentTime(time: number) {
    this._currentTime = time;
    if (this.player && this.player.seekTo) {
      this.player.seekTo(time, true).catch(() => {});
    }
  }

  get loop() { return this._loop; }
  set loop(val: boolean) {
    this._loop = val;
  }

  destroy() {
    this.stopChecking();
    if (this.player) {
      try {
        this.player.destroy();
      } catch (e) {}
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

export const createYouTubeAudio = (videoId: string): any => {
  return new YouTubeAudio(videoId);
};
