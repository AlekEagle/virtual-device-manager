import * as childProcess from 'child_process';

export interface PAChannelVolume {
  bit: number;
  percent: number;
  decibels: number;
}

export interface PALatency {
  real: number;
  configured: number;
}

export interface PAVolume {
  channels:
    | {
        [key: string]: PAChannelVolume;
      }
    | '(invalid)';
  balance: number;
}

export interface PASampleSpecification {
  format: string;
  channels: string;
  frequency: number;
}

export const enum PAState {
  Suspended,
  Idle,
  Running,
  Unknown
}

export interface PASinkInputLatency {
  buffer: number;
  sink: number;
}

export interface PASourceOutputLatency {
  buffer: number;
  source: number;
}

export declare type PAQueryTypes =
  | 'sinks'
  | 'sources'
  | 'modules'
  | 'sink-inputs'
  | 'source-outputs'
  | 'clients'
  | 'samples'
  | 'cards';

export async function fetchFromPactl(
  type?: PAQueryTypes,
  omitVirtCables: boolean = true
) {
  let items: PAItem[] = [];
  let child;
  try {
    child = childProcess.execSync(`pactl list${type ? ` ${type}` : ''}`, {
      encoding: 'utf-8'
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
  let sstdout = child.split('\n\n');
  sstdout.forEach(element => {
    if (element.length < 1) return;
    let type = element.split(' #')[0];
    switch (type) {
      case 'Sink':
        items.push(new PASink(element));
        break;
      case 'Source':
        items.push(new PASource(element));
        break;
      case 'Sink Input':
        items.push(new PASinkInput(element));
        break;
      case 'Source Output':
        items.push(new PASourceOutput(element));
        break;
    }
  });

  return omitVirtCables
    ? items.filter(i => i.driver !== 'module-loopback.c')
    : items;
}

export async function getVirtualCables() {
  let vOut = (await fetchFromPactl('source-outputs', false)).filter(
      o => o.driver === 'module-loopback.c'
    ),
    vIn = (await fetchFromPactl('sink-inputs', false)).filter(
      o => o.driver === 'module-loopback.c'
    );

  return vOut.map(
    o =>
      new PAVirtualCable(
        o as PASourceOutput,
        vIn.find(
          i => (o as PASourceOutput).owner === (i as PASinkInput).owner
        ) as PASinkInput
      )
  );
}

export declare type PAType =
  | 'sink'
  | 'source'
  | 'module'
  | 'sink-input'
  | 'source-output'
  | 'client'
  | 'sample'
  | 'card';

export declare interface PAItem {
  type: PAType;
  properties: any;
  id: number;
  driver: string;
  other: any;
}

export class PASink implements PAItem {
  public type: PAType = 'sink';
  public properties: any = {};
  public name: string = 'n/a'; // default values to make the compiler shut the up
  public description: string = 'n/a';
  public id: number = -1;
  public owner: number = -1;
  public driver: string = 'n/a';
  public other: any = {};
  public volume: PAVolume = {
    balance: 0,
    channels: '(invalid)'
  };
  public state: PAState = PAState.Unknown;
  public channelMap: string[] = [];
  public sampleSpec: PASampleSpecification = {
    format: 'n/a',
    channels: 'n/a',
    frequency: -1
  };
  public muted: boolean = false;
  public baseVolume: PAChannelVolume = {
    bit: 65536,
    percent: 1,
    decibels: 0
  };
  public monitor: string = 'n/a';
  public latency: PALatency = { real: -1, configured: -1 };
  public flags: string[] = [];
  public activePort: string = 'n/a';
  public ports: { [key: string]: string } = {};
  public formats: string[] = [];

  constructor(data: string) {
    let sData = data.split('\n').filter(a => a.length > 0);
    let curKey = '';
    sData.forEach((val, ind) => {
      if (val.includes('balance')) return;
      if (ind === 0) {
        let a = val.split(' #');
        this.id = parseInt(a[1]);
        if (this.type !== a[0].replace(' ', '-').toLowerCase())
          throw new Error(
            `Type ${a[0]
              .replace(' ', '-')
              .toLowerCase()} is not compatible with PASink.`
          );
        return;
      }
      if (val.startsWith('\t\t')) {
        switch (curKey) {
          case 'properties':
            let propKvPair = val.replace('\t\t', '').split(' = ');
            let valStripped = propKvPair[1].replace(/^"([\s\S]*?)"$/, '$1'),
              keyTree = propKvPair[0].split('.'),
              lvl = 0;
            function recursiveSet(obj: any) {
              if (lvl === keyTree.length - 1) {
                obj[keyTree[lvl]] = valStripped;
                return;
              } else {
                if (!obj[keyTree[lvl]]) obj[keyTree[lvl]] = {};
                recursiveSet(obj[keyTree[lvl++]]);
              }
            }
            recursiveSet(this.properties);
            break;
          case 'ports':
            let portKvPair = val.replace('\t\t', '').split(': ');
            this.ports[portKvPair[0]] = portKvPair.slice(1).join(': ');
            break;
          case 'formats':
            this.formats.push(val.replace('\t\t', ''));
            break;
          default:
            (this as any)[curKey] = val.replace('\t\t', '');
            break;
        }
      } else {
        let kvPair = val
          .replace(/\t/g, '')
          .trim()
          .split(/: /);
        curKey = kvPair[0].toLowerCase().replace(':', '');
        switch (kvPair[0]) {
          case 'State':
            switch (kvPair[1]) {
              case 'SUSPENDED':
                this.state = PAState.Suspended;
                break;
              case 'IDLE':
                this.state = PAState.Idle;
                break;
              case 'RUNNING':
                this.state = PAState.Running;
                break;
              default:
                this.state = PAState.Unknown;
                break;
            }
            break;
          case 'Name':
            this.name = kvPair[1];
            break;
          case 'Description':
            this.description = kvPair[1];
            break;
          case 'Driver':
            this.driver = kvPair[1];
            break;
          case 'Sample Specification':
            let sampleSpecification = kvPair[1].split(' ');
            this.sampleSpec = {
              format: sampleSpecification[0],
              channels: sampleSpecification[1].replace('ch', ''),
              frequency: parseInt(sampleSpecification[2].replace('Hz', ''))
            };
            break;
          case 'Channel Map':
            this.channelMap = kvPair[1].split('.');
            break;
          case 'Owner Module':
            this.owner = parseInt(kvPair[1]);
            break;
          case 'Mute':
            this.muted = kvPair[1] === 'yes';
            break;
          case 'Volume':
            this.volume.balance = parseInt(
              sData[ind + 1]
                .replace(/\t/g, '')
                .trim()
                .split(' ')[1]
            );
            let chLvls = kvPair
              .slice(1)
              .join(': ')
              .split(',   ');
            if (chLvls[0] === '(invalid)') {
              this.volume.channels = '(invalid)';
            } else {
              this.volume.channels = {};
              chLvls.forEach(chLvl => {
                let chKvPair = chLvl.split(': ');
                let lvls = chKvPair[1].split(' / ');
                (this.volume.channels as {
                  [key: string]: PAChannelVolume;
                })[chKvPair[0]] = {
                  bit: parseInt(lvls[0]),
                  percent: parseInt(lvls[1].replace('%', '')) / 100,
                  decibels: parseFloat(lvls[2].replace(' dB', ''))
                };
              });
            }
            break;
          case 'Base Volume':
            let lvls = kvPair[1].split(' / ');
            this.baseVolume = {
              bit: parseInt(lvls[0]),
              percent: parseInt(lvls[1].replace('%', '')) / 100,
              decibels: parseFloat(lvls[2].replace(' dB', ''))
            };
            break;
          case 'Monitor Source':
            this.monitor = kvPair[1];
            break;
          case 'Latency':
            let latVals = kvPair[1].split(', ');
            this.latency = {
              real: parseInt(latVals[0].split(' ')[0]),
              configured: parseInt(latVals[1].split(' ')[1])
            };
            break;
          case 'Flags':
            this.flags = kvPair[1].split(' ');
            break;
        }
      }
    });
  }
}

export class PASource implements PAItem {
  public type: PAType = 'source';
  public properties: any = {};
  public name: string = 'n/a'; // default values to make the compiler shut the up
  public description: string = 'n/a';
  public id: number = -1;
  public owner: number = -1;
  public driver: string = 'n/a';
  public other: any = {};
  public volume: PAVolume = {
    balance: 0,
    channels: '(invalid)'
  };
  public state: PAState = PAState.Unknown;
  public channelMap: string[] = [];
  public sampleSpec: PASampleSpecification = {
    format: 'n/a',
    channels: 'n/a',
    frequency: -1
  };
  public muted: boolean = false;
  public baseVolume: PAChannelVolume = {
    bit: 65536,
    percent: 1,
    decibels: 0
  };
  public monitor: string = 'n/a';
  public latency: PALatency = { real: -1, configured: -1 };
  public flags: string[] = [];
  public activePort: string = 'n/a';
  public ports: { [key: string]: string } = {};
  public formats: string[] = [];

  constructor(data: string) {
    let sData = data.split('\n').filter(a => a.length > 0);
    let curKey = '';
    sData.forEach((val, ind) => {
      if (val.includes('balance')) return;
      if (ind === 0) {
        let a = val.split(' #');
        this.id = parseInt(a[1]);
        if (this.type !== a[0].replace(' ', '-').toLowerCase())
          throw new Error(
            `Type ${a[0]
              .replace(' ', '-')
              .toLowerCase()} is not compatible with PASource.`
          );
        return;
      }
      if (val.startsWith('\t\t')) {
        switch (curKey) {
          case 'properties':
            let propKvPair = val.replace('\t\t', '').split(' = ');
            let valStripped = propKvPair[1].replace(/^"([\s\S]*?)"$/, '$1'),
              keyTree = propKvPair[0].split('.'),
              lvl = 0;
            function recursiveSet(obj: any) {
              if (lvl === keyTree.length - 1) {
                obj[keyTree[lvl]] = valStripped;
                return;
              } else {
                if (!obj[keyTree[lvl]]) obj[keyTree[lvl]] = {};
                recursiveSet(obj[keyTree[lvl++]]);
              }
            }
            recursiveSet(this.properties);
            break;
          case 'ports':
            let portKvPair = val.replace('\t\t', '').split(': ');
            this.ports[portKvPair[0]] = portKvPair.slice(1).join(': ');
            break;
          case 'formats':
            this.formats.push(val.replace('\t\t', ''));
            break;
          default:
            (this as any)[curKey] = val.replace('\t\t', '');
            break;
        }
      } else {
        let kvPair = val
          .replace(/\t/g, '')
          .trim()
          .split(/: /);
        curKey = kvPair[0].toLowerCase().replace(':', '');
        switch (kvPair[0]) {
          case 'State':
            switch (kvPair[1]) {
              case 'SUSPENDED':
                this.state = PAState.Suspended;
                break;
              case 'IDLE':
                this.state = PAState.Idle;
                break;
              case 'RUNNING':
                this.state = PAState.Running;
                break;
              default:
                this.state = PAState.Unknown;
                break;
            }
            break;
          case 'Name':
            this.name = kvPair[1];
            break;
          case 'Description':
            this.description = kvPair[1];
            break;
          case 'Driver':
            this.driver = kvPair[1];
            break;
          case 'Sample Specification':
            let sampleSpecification = kvPair[1].split(' ');
            this.sampleSpec = {
              format: sampleSpecification[0],
              channels: sampleSpecification[1].replace('ch', ''),
              frequency: parseInt(sampleSpecification[2].replace('Hz', ''))
            };
            break;
          case 'Channel Map':
            this.channelMap = kvPair[1].split('.');
            break;
          case 'Owner Module':
            this.owner = parseInt(kvPair[1]);
            break;
          case 'Mute':
            this.muted = kvPair[1] === 'yes';
            break;
          case 'Volume':
            this.volume.balance = parseInt(
              sData[ind + 1]
                .replace(/\t/g, '')
                .trim()
                .split(' ')[1]
            );
            let chLvls = kvPair
              .slice(1)
              .join(': ')
              .split(',   ');
            if (chLvls[0] === '(invalid)') {
              this.volume.channels = '(invalid)';
            } else {
              this.volume.channels = {};
              chLvls.forEach(chLvl => {
                let chKvPair = chLvl.split(': ');
                let lvls = chKvPair[1].split(' / ');
                (this.volume.channels as {
                  [key: string]: PAChannelVolume;
                })[chKvPair[0]] = {
                  bit: parseInt(lvls[0]),
                  percent: parseInt(lvls[1].replace('%', '')) / 100,
                  decibels: parseFloat(lvls[2].replace(' dB', ''))
                };
              });
            }
            break;
          case 'Base Volume':
            let lvls = kvPair[1].split(' / ');
            this.baseVolume = {
              bit: parseInt(lvls[0]),
              percent: parseInt(lvls[1].replace('%', '')) / 100,
              decibels: parseFloat(lvls[2].replace(' dB', ''))
            };
            break;
          case 'Monitor of Sink':
            this.monitor = kvPair[1];
            break;
          case 'Latency':
            let latVals = kvPair[1].split(', ');
            this.latency = {
              real: parseInt(latVals[0].split(' ')[0]),
              configured: parseInt(latVals[1].split(' ')[1])
            };
            break;
          case 'Flags':
            this.flags = kvPair[1].split(' ');
            break;
        }
      }
    });
  }
}

export class PASinkInput implements PAItem {
  public type: PAType = 'sink-input';
  public id: number = -1;
  public driver: string = 'n/a';
  public owner: number = -1;
  public client: number = -1;
  public sink: number = -1;
  public sampleSpec: PASampleSpecification = {
    format: 'n/a',
    channels: 'n/a',
    frequency: -1
  };
  public channelMap: string[] = [];
  public format: string = 'n/a';
  public corked: boolean = false;
  public muted: boolean = false;
  public volume: PAVolume = {
    balance: 0,
    channels: '(invalid)'
  };
  public latency: PASinkInputLatency = { buffer: -1, sink: -1 };
  public resampleMethod: string = 'n/a';
  public properties: any = {};
  public other: any = {};

  constructor(data: string) {
    let sData = data.split('\n').filter(a => a.length > 0);
    let curKey = '';
    sData.forEach((val, ind) => {
      if (val.includes('balance')) return;
      if (ind === 0) {
        let a = val.split(' #');
        this.id = parseInt(a[1]);
        if (this.type !== a[0].replace(' ', '-').toLowerCase())
          throw new Error(
            `Type ${a[0]
              .replace(' ', '-')
              .toLowerCase()} is not compatible with PASinkInput.`
          );
        return;
      }
      if (val.startsWith('\t\t')) {
        switch (curKey) {
          case 'properties':
            let propKvPair = val.replace('\t\t', '').split(' = ');
            let valStripped = propKvPair[1].replace(/^"([\s\S]*?)"$/, '$1'),
              keyTree = propKvPair[0].split('.'),
              lvl = 0;
            function recursiveSet(obj: any) {
              if (lvl === keyTree.length - 1) {
                obj[keyTree[lvl]] = valStripped;
                return;
              } else {
                if (!obj[keyTree[lvl]]) obj[keyTree[lvl]] = {};
                recursiveSet(obj[keyTree[lvl++]]);
              }
            }
            recursiveSet(this.properties);
            break;
          default:
            (this as any)[curKey] = val.replace('\t\t', '');
            break;
        }
      } else {
        let kvPair = val
          .replace(/\t/g, '')
          .trim()
          .split(/: /);
        curKey = kvPair[0].toLowerCase().replace(':', '');
        switch (kvPair[0]) {
          case 'Driver':
            this.driver = kvPair[1];
            break;
          case 'Sample Specification':
            let sampleSpecification = kvPair[1].split(' ');
            this.sampleSpec = {
              format: sampleSpecification[0],
              channels: sampleSpecification[1].replace('ch', ''),
              frequency: parseInt(sampleSpecification[2].replace('Hz', ''))
            };
            break;
          case 'Channel Map':
            this.channelMap = kvPair[1].split('.');
            break;
          case 'Owner Module':
            this.owner = parseInt(kvPair[1]);
            break;
          case 'Mute':
            this.muted = kvPair[1] === 'yes';
            break;
          case 'Corked':
            this.corked = kvPair[1] === 'yes';
            break;
          case 'Volume':
            this.volume.balance = parseInt(
              sData[ind + 1]
                .replace(/\t/g, '')
                .trim()
                .split(' ')[1]
            );
            let chLvls = kvPair
              .slice(1)
              .join(': ')
              .split(',   ');
            if (chLvls[0] === '(invalid)') {
              this.volume.channels = '(invalid)';
            } else {
              this.volume.channels = {};
              chLvls.forEach(chLvl => {
                let chKvPair = chLvl.split(': ');
                let lvls = chKvPair[1].split(' / ');
                (this.volume.channels as {
                  [key: string]: PAChannelVolume;
                })[chKvPair[0]] = {
                  bit: parseInt(lvls[0]),
                  percent: parseInt(lvls[1].replace('%', '')) / 100,
                  decibels: parseFloat(lvls[2].replace(' dB', ''))
                };
              });
            }
            break;
          case 'Client':
            this.client = parseInt(kvPair[1]);
            break;
          case 'Buffer Latency':
            this.latency.buffer = parseInt(kvPair[1].replace(' usec', ''));
            break;
          case 'Sink Latency':
            this.latency.sink = parseInt(kvPair[1].replace(' usec', ''));
            break;
          case 'Format':
            this.format = kvPair[1].split(',')[0];
            break;
          case 'Sink':
            this.sink = parseInt(kvPair[1]);
            break;
          case 'Resample method':
            this.resampleMethod = kvPair[1];
            break;
        }
      }
    });
  }

  public async changeSink(sink: PASink) {
    let child;
    try {
      child = childProcess.execSync(
        `pactl move-sink-input ${this.id} ${sink.id}`,
        {
          encoding: 'utf-8'
        }
      );
    } catch (err) {
      console.error(err);
      throw err;
    }

    this.sink = sink.id;
    return;
  }

  public async toggleMute() {
    let child;
    try {
      child = childProcess.execSync(
        `pactl set-sink-input-mute ${this.id} toggle`,
        {
          encoding: 'utf8'
        }
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
    this.muted = !this.muted;
  }
}

export class PASourceOutput implements PAItem {
  public type: PAType = 'source-output';
  public id: number = -1;
  public driver: string = 'n/a';
  public owner: number = -1;
  public client: number = -1;
  public source: number = -1;
  public sampleSpec: PASampleSpecification = {
    format: 'n/a',
    channels: 'n/a',
    frequency: -1
  };
  public channelMap: string[] = [];
  public format: string = 'n/a';
  public corked: boolean = false;
  public muted: boolean = false;
  public volume: PAVolume = {
    balance: 0,
    channels: '(invalid)'
  };
  public latency: PASourceOutputLatency = { buffer: -1, source: -1 };
  public resampleMethod: string = 'n/a';
  public properties: any = {};
  public other: any = {};

  constructor(data: string) {
    let sData = data.split('\n').filter(a => a.length > 0);
    let curKey = '';
    sData.forEach((val, ind) => {
      if (val.includes('balance')) return;
      if (ind === 0) {
        let a = val.split(' #');
        this.id = parseInt(a[1]);
        if (this.type !== a[0].replace(' ', '-').toLowerCase())
          throw new Error(
            `Type ${a[0]
              .replace(' ', '-')
              .toLowerCase()} is not compatible with PASourceOutput.`
          );
        return;
      }
      if (val.startsWith('\t\t')) {
        switch (curKey) {
          case 'properties':
            let propKvPair = val.replace('\t\t', '').split(' = ');
            let valStripped = propKvPair[1].replace(/^"([\s\S]*?)"$/, '$1'),
              keyTree = propKvPair[0].split('.'),
              lvl = 0;
            function recursiveSet(obj: any) {
              if (lvl === keyTree.length - 1) {
                obj[keyTree[lvl]] = valStripped;
                return;
              } else {
                if (!obj[keyTree[lvl]]) obj[keyTree[lvl]] = {};
                recursiveSet(obj[keyTree[lvl++]]);
              }
            }
            recursiveSet(this.properties);
            break;
          default:
            (this as any)[curKey] = val.replace('\t\t', '');
            break;
        }
      } else {
        let kvPair = val
          .replace(/\t/g, '')
          .trim()
          .split(/: /);
        curKey = kvPair[0].toLowerCase().replace(':', '');
        switch (kvPair[0]) {
          case 'Driver':
            this.driver = kvPair[1];
            break;
          case 'Sample Specification':
            let sampleSpecification = kvPair[1].split(' ');
            this.sampleSpec = {
              format: sampleSpecification[0],
              channels: sampleSpecification[1].replace('ch', ''),
              frequency: parseInt(sampleSpecification[2].replace('Hz', ''))
            };
            break;
          case 'Channel Map':
            this.channelMap = kvPair[1].split('.');
            break;
          case 'Owner Module':
            this.owner = parseInt(kvPair[1]);
            break;
          case 'Mute':
            this.muted = kvPair[1] === 'yes';
            break;
          case 'Corked':
            this.corked = kvPair[1] === 'yes';
            break;
          case 'Volume':
            this.volume.balance = parseInt(
              sData[ind + 1]
                .replace(/\t/g, '')
                .trim()
                .split(' ')[1]
            );
            let chLvls = kvPair
              .slice(1)
              .join(': ')
              .split(',   ');
            if (chLvls[0] === '(invalid)') {
              this.volume.channels = '(invalid)';
            } else {
              this.volume.channels = {};
              chLvls.forEach(chLvl => {
                let chKvPair = chLvl.split(': ');
                let lvls = chKvPair[1].split(' / ');
                (this.volume.channels as {
                  [key: string]: PAChannelVolume;
                })[chKvPair[0]] = {
                  bit: parseInt(lvls[0]),
                  percent: parseInt(lvls[1].replace('%', '')) / 100,
                  decibels: parseFloat(lvls[2].replace(' dB', ''))
                };
              });
            }
            break;
          case 'Client':
            this.client = parseInt(kvPair[1]);
            break;
          case 'Buffer Latency':
            this.latency.buffer = parseInt(kvPair[1].replace(' usec', ''));
            break;
          case 'Source Latency':
            this.latency.source = parseInt(kvPair[1].replace(' usec', ''));
            break;
          case 'Format':
            this.format = kvPair[1].split(',')[0];
            break;
          case 'Source':
            this.source = parseInt(kvPair[1]);
            break;
          case 'Resample method':
            this.resampleMethod = kvPair[1];
            break;
        }
      }
    });
  }

  public async changeSource(source: PASource) {
    let child;
    try {
      child = childProcess.execSync(
        `pactl move-source-output ${this.id} ${source.id}`,
        {
          encoding: 'utf-8'
        }
      );
    } catch (err) {
      console.error(err);
      throw err;
    }

    this.source = source.id;
    return;
  }

  public async toggleMute() {
    let child;
    try {
      child = childProcess.execSync(
        `pactl set-source-output-mute ${this.id} toggle`,
        {
          encoding: 'utf8'
        }
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
    this.muted = !this.muted;
  }
}

export class PAVirtualCable {
  public output: PASourceOutput;
  public input: PASinkInput;
  public type: string = 'virtual-cable';

  constructor(o: PASourceOutput, i: PASinkInput) {
    this.output = o;
    this.input = i;
  }

  public async delete() {
    let child;
    try {
      child = childProcess.execSync(`pactl unload-module ${this.input.owner}`, {
        encoding: 'utf-8'
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
    return;
  }
}

export async function createNullSink(name: string) {
  let child;
  try {
    child = childProcess.execSync(
      `pactl load-module module-null-sink sink_name=${name.replace(/ /g, '_')}`,
      { encoding: 'utf-8' }
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
}
export default {
  fetchFromPactl,
  getVirtualCables
};
