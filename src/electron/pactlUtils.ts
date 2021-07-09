import * as childProcess from 'child_process';

export const enum PactlType {
  Sinks,
  Sources,
  Modules,
  SinkInputs,
  SourceOutputs,
  Clients,
  Samples,
  Cards,
  All
}

export const enum PAItemState {
  Running,
  Idle,
  Suspended
}

async function fetchFromPactl(type?: PactlType) {
  let listType: string;

  switch (type) {
    case PactlType.Sinks:
      listType = 'sinks';
      break;
    case PactlType.Sources:
      listType = 'sources';
      break;
    case PactlType.Modules:
      listType = 'modules';
      break;
    case PactlType.SinkInputs:
      listType = 'sink-inputs';
      break;
    case PactlType.SourceOutputs:
      listType = 'source-outputs';
      break;
    case PactlType.Clients:
      listType = 'clients';
      break;
    case PactlType.Samples:
      listType = 'samples';
      break;
    case PactlType.Cards:
      listType = 'cards';
      break;
    case PactlType.All:
    default:
      listType = '';
  }

  let items: PactlItem[] = [];
  let child;
  try {
    child = childProcess.execSync(
      `pactl list${listType !== '' ? ` ${listType}` : ''}`,
      { encoding: 'utf-8' }
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
  let sstdout = child.split('\n\n');
  sstdout.forEach(element => {
    if (element.length < 1) return;
    items.push(new PactlItem(element));
  });
  return items;
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
  public name: string = 'n/a';
  public description: string = 'n/a';
  public id: number = -1; // default values to make the compiler shut the up
  public owner: number = -1;
  public driver: string = 'n/a';
  public other: any = {};

  constructor(data: string) {
    let sData = data.split('\n').filter(a => a.length > 0);
    let curKey = '';
    sData.forEach((val, ind) => {
      if (val.includes('balance')) return;
    });
  }
}

export class PactlItem {
  public id?: number;
  public type?: string;
  public state?: PAItemState;
  public other: any = {};
  public name?: string;
  public description?: string;
  public driver: string = '';
  public sampleSpec?: any = {};
  public channelMap?: string[];
  public owner?: number;
  public muted?: boolean;
  public volume?: any = {};
  public baseVolume?: any = {};
  public monitor?: string;
  public latency?: any = {};
  public flags?: string[];
  public activePort?: string;
  public activeProfile?: string;
  public properties: any = {};
  public ports?: string[] = [];
  public formats?: string[] = [];
  public profiles?: string[] = [];
  public sink?: number;
  constructor(data: string) {
    let sData = data.split('\n').filter(a => a.length > 0);
    let curKey = '';
    sData.forEach((v, i) => {
      if (v.includes('balance')) return;
      if (i === 0) {
        let a = v.split(' #');
        this.type = a[0];
        this.id = parseInt(a[1]);
      } else {
        if (v.startsWith('\t\t')) {
          let b = v.replace('\t\t', '').split(' = ');
          if (b.length > 1) {
            let val = b[1].replace(/^"([\s\S]*?)"$/, '$1');
            let c = b[0].split('.');
            let lvl = 0;
            function recursiveSet(obj: any) {
              if (lvl === c.length - 1) {
                obj[c[lvl]] = val;
                return;
              } else {
                if (!obj[c[lvl]]) obj[c[lvl]] = {};
                recursiveSet(obj[c[lvl++]]);
              }
            }
            recursiveSet((this as any)[curKey]);
          } else {
            (this as any)[curKey].push(b[0]);
          }
        } else {
          let a = v.replace(/\t/g, '').trim();
          let b = a.split(/: /);
          curKey = b[0].toLowerCase().replace(':', '');
          switch (b[0]) {
            case 'State':
              switch (b[1]) {
                case 'RUNNING':
                  this.state = PAItemState.Running;
                  break;
                case 'IDLE':
                  this.state = PAItemState.Idle;
                  break;
                case 'SUSPENDED':
                  this.state = PAItemState.Suspended;
                  break;
                default:
                  this.state = undefined;
              }
              break;
            case 'Name':
              this.name = b[1];
              break;
            case 'Description':
              this.description = b[1];
              break;
            case 'Driver':
              this.driver = b[1];
              break;
            case 'Sample Specification':
              let c = b[1].split(' ');
              this.sampleSpec = {
                format: c[0],
                channels: c[1].replace('ch', ''),
                frequency: parseInt(c[2].replace('Hz', ''))
              };
              break;
            case 'Channel Map':
              this.channelMap = b[1].split(',');
              break;
            case 'Owner Module':
              this.owner = parseInt(b[1]);
              break;
            case 'Mute':
              this.muted = b[1] === 'yes';
              break;
            case 'Volume':
              this.volume.balance = sData[i + 1]
                .replace(/\t/g, '')
                .trim()
                .split(' ')[1];
              let d = b
                .slice(1)
                .join(': ')
                .split(',   ');
              d.forEach(val => {
                let a = val.split(': ');
                if (a.length < 2) {
                  this.volume = a[0];
                  return;
                }
                let b = a[1].split(' / ');
                this.volume[a[0]] = {
                  bit: parseInt(b[0]),
                  percent: parseInt(b[1].replace('%', '')) / 100,
                  decibels: parseFloat(b[2].replace(' dB', ''))
                };
              });
              break;
            case 'Base Volume':
              let e = b[1].split(' / ');
              this.baseVolume = {
                bit: parseInt(e[0]),
                percent: parseInt(e[1].replace('%', '')) / 100,
                decibels: parseFloat(e[2].replace(' dB', ''))
              };
              break;
            case 'Monitor Source':
              this.monitor = b[1];
              break;
            case 'Latency':
              let f = b[1].split(', ');
              this.latency = {
                configured: parseInt(
                  f[1].replace(/configured (\d+) usec/, '$1')
                ),
                real: parseInt(f[0].replace(' usec', ''))
              };
              break;
            case 'Flags':
              this.flags = b[1].split(' ');
              break;
            case 'Active Port':
              this.activePort = b[1];
              break;
            case 'Sink':
              this.sink = parseInt(b[1]);
              break;
            case 'Monitor of Sink':
              this.monitor = b[1];
              break;
            default:
              if (
                curKey !== 'ports' &&
                curKey !== 'properties' &&
                curKey !== 'formats'
              ) {
                this.other[b[0]] = b[1];
              }
          }
        }
      }
    });
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

export async function getSinks() {
  return await fetchFromPactl(PactlType.Sinks);
}

export async function getSources() {
  return await fetchFromPactl(PactlType.Sources);
}

export async function getModules() {
  return await fetchFromPactl(PactlType.Modules);
}

export async function getSinkInputs() {
  return await fetchFromPactl(PactlType.SinkInputs);
}

export async function getSourceOutputs() {
  return await fetchFromPactl(PactlType.SourceOutputs);
}

export async function getClients() {
  return await fetchFromPactl(PactlType.Clients);
}

export async function getSamples() {
  return await fetchFromPactl(PactlType.Samples);
}

export async function getCards() {
  return await fetchFromPactl(PactlType.Cards);
}

export async function getAll() {
  return await fetchFromPactl();
}

export default {
  getSinks,
  getSources,
  getModules,
  getSinkInputs,
  getSourceOutputs,
  getClients,
  getSamples,
  getCards,
  getAll
};
