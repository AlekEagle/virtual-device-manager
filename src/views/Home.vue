<template>
  <div ref="first" class="projects third-body">
    <Project
      v-for="(source, index) in sources"
      :key="`${source.type}${source.id}`"
      :classes="['auth', $data.selectedNodes.find(a => a.side === 0 && a.index === index) ? 'selected' : undefined]"
      :id="'source' + index"
      :disabled="$data.changingConnection && (source.type === 'sink-input' || $data.connectionType === 'sink')"
      :action="(function() {
        if (!$data.changingConnection) {
          $data.nodeSelection = $data.nodeSelection === undefined ? {side: 0, index} : undefined;
          $refs.manageNodeModal.showModal();
        }else {
          if (!$data.selectedNodes.find(a=>a.side===0)) 
            $data.selectedNodes.push({side: 0, index});
          if ($data.connectionType !== 'virtCable' && $data.selectedNodes.length > 0) {
            $refs.changeConnectionModal.showModal();
          }
          if ($data.connectionType === 'virtCable' && $data.selectedNodes.length > 1) $refs.createVirtualCableModal.showModal();
        }
      })"
      :title="
        source.description ? source.description : source.properties.media.name
      "
    >
    </Project>
  </div>
  <div ref="second" class="projects third-body right">
    <Project
      v-for="(sink, index) in sinks"
      :classes="['auth', $data.selectedNodes.find(a => a.side === 1 && a.index === index) ? 'selected' : undefined]"
      :id="'sink' + index"
      :key="`${sink.type}${sink.id}`"
      :disabled="$data.changingConnection && (sink.type === 'source-output' || $data.connectionType === 'source')"
      :action="(function() {
        if (!$data.changingConnection) {
          $data.nodeSelection = $data.nodeSelection === undefined ? {side: 1, index} : undefined;
          $refs.manageNodeModal.showModal();
        }else {
          if (!$data.selectedNodes.find(a=>a.side===1)) 
            $data.selectedNodes.push({side: 1, index});
          if ($data.connectionType !== 'virtCable' && $data.selectedNodes.length > 0) {
            $refs.changeConnectionModal.showModal();
          }
          if ($data.connectionType === 'virtCable' && $data.selectedNodes.length > 1) $refs.createVirtualCableModal.showModal();
        }
      })"
      :title="sink.description ? sink.description : sink.properties.media.name"
    >
    </Project>
  </div>

  <Modal
    title="Manage Cable"
    ref="manageCableModal"
    :cancelable="false"
    :buttons="[
      {
        text: 'Cancel',
        title: 'Click this when you change your mind!',
        action: this.hideManageCableModal
      }
    ]"
  >
    <div class="cable_modal_div_container">
      <div class="modal_left cable_modal_div">
        <p class="con_ident">Routing Audio From:</p>
        {{
          $data.currentFocusedCable.type === 'virtual-cable'
            ? $data.sources.find(
                source => $data.currentFocusedCable.output.source === source.id
              ).description
            : $data.currentFocusedCable.type === 'source-output'
            ? $data.sources.find(
                source => $data.currentFocusedCable.source === source.id
              ).description
            : $data.currentFocusedCable.description
            ? $data.currentFocusedCable.description
            : $data.currentFocusedCable.properties.media.name
        }}<br />
        <button
          class="button"
          :disabled="
            $data.currentFocusedCable.type !== 'virtual-cable' &&
              $data.currentFocusedCable.type !== 'source-output'
          "
          @click="beginChangeSourceConnection"
          :title="
            $data.currentFocusedCable.type !== 'virtual-cable' &&
            $data.currentFocusedCable.type !== 'source-output'
              ? `You can\'t change the source location on a ${$data.currentFocusedCable.type.replace(
                  '-',
                  ' '
                )} cable!`
              : `Change the source location of the ${$data.currentFocusedCable.type.replace(
                  '-',
                  ' '
                )}.`
          "
          >Change Source Connection
        </button>
      </div>
      <div class="modal_right cable_modal_div">
        <p class="con_ident">Routing Audio To:</p>
        {{
          this.$data.currentFocusedCable.type === 'virtual-cable'
            ? $data.sinks.find(
                sink => $data.currentFocusedCable.input.sink === sink.id
              ).description
            : $data.currentFocusedCable.type === 'sink-input'
            ? $data.sinks.find(
                sink => $data.currentFocusedCable.sink === sink.id
              ).description
            : $data.sinks.find(sink => sink.id === $data.currentFocusedCable.id)
                .description
            ? $data.sinks.find(sink => sink.id === $data.currentFocusedCable.id)
                .description
            : $data.sinks.find(sink => sink.id === $data.currentFocusedCable.id)
                .properties.media.name
        }}<br />
        <button
          class="button"
          :disabled="$data.currentFocusedCable.type === 'source-output'"
          @click="beginChangeSinkConnection"
          :title="
            $data.currentFocusedCable.type === 'source-output'
              ? `You can\'t change the sink location on a ${$data.currentFocusedCable.type.replace(
                  '-',
                  ' '
                )} cable!`
              : `Change the sink location of the ${$data.currentFocusedCable.type.replace(
                  '-',
                  ' '
                )}.`
          "
          >Change Sink Connection
        </button>
      </div>
      <button
        v-if="this.$data.currentFocusedCable.type === 'virtual-cable'"
        class="button"
        @click="this.deleteVirtCable"
        title="This will delete this virtual cable!"
        >Delete Virtual Cable</button
      >
    </div> </Modal
  >
  <Modal title="Manage Node" ref="manageNodeModal" :buttons="[
  { title: 'Disregard all changes made.', text: 'Cancel', action:(function() {$refs.manageNodeModal.hideModal();$data.nodeSelection = undefined;})}]">
    <template v-if="$data.nodeSelection !== undefined">
      {{$data.nodeSelection.side === 0 ? $data.sources[$data.nodeSelection.index].description : $data.sinks[$data.nodeSelection.index].description}}<br />
  <button class="button" @click="beginCreateVirtualCable" title="Create a virtual cable using this node!">Create Virtual Cable</button><br /><br />
      <p v-if="($data.nodeSelection.side === 0 ? $data.sources[$data.nodeSelection.index].driver : $data.sinks[$data.nodeSelection.index].driver) === 'module-null-sink.c'">If you delete a virtual node with active connections to it, those connections will move to other available nodes and might create a feedback loop. Be careful!</p>
      <button class="button" v-if="($data.nodeSelection.side === 0 ? $data.sources[$data.nodeSelection.index].driver : $data.sinks[$data.nodeSelection.index].driver) === 'module-null-sink.c'" title="This will delete this null node. Any connections to it will be moved to possibly unwanted locations." @click="this.deleteNullSink">Delete Virtual Node</button>
    </template>
  </Modal>
  <Modal title="Create Virtual Cable" ref="createVirtualCableModal" :buttons="[
  { title: 'Cancel the operation.', text: 'Cancel', action: (function() {
    $refs.createVirtualCableModal.hideModal();
    $data.selectedNodes = [];
    $data.changingConnection = false;
    $data.connectionType = undefined;
    })}, {title: 'Create the cable', text: 'Create', action: (function() {
    $refs.createVirtualCableModal.hideModal();
    createVirtualCable();
    })}]">
    Are you sure you want to connect {{$data.selectedNodes[0].side === 0 ? $data.sources[$data.selectedNodes[0].index].description : $data.sinks[$data.selectedNodes[0].index].description}} to {{$data.selectedNodes[1].side === 0 ? $data.sources[$data.selectedNodes[1].index].description : $data.sinks[$data.selectedNodes[1].index].description}}?
  </Modal>
  <Modal title="Change Connection" ref="changeConnectionModal" :buttons="[
  { title: 'Cancel the operation.', text: 'Cancel', action: (function() {
    $refs.changeConnectionModal.hideModal();
    $data.selectedNodes = [];
    $data.changingConnection = false;
    $data.connectionType = undefined;
    })}, {title: 'Change the connection', text: 'Move', action: (function() {
    $refs.changeConnectionModal.hideModal();
    changeConnection();
    })}]">
    Are you sure you want to change the connection to {{$data.selectedNodes[0].side === 0 ? $data.sources[$data.selectedNodes[0].index].description : $data.sinks[$data.selectedNodes[0].index].description}}?
    </Modal>
    <Modal title="Create Virtual Node" ref="createVirtualNodeModal" :cancelable="true" :buttons="[
      {
        text: 'Create',
        title: 'Create the virtual node!',
        action: createVirtualNode
      }
    ]">
    <form @submit.prevent="createVirtualNode">
      <input type="text" class="darktextbox" value="" ref="virtualNodeName" placeholder="Virtual Node Name" />
    </form>
    </Modal>
  <Footer />
</template>

<script lang="ts">
  import { Vue, Options } from 'vue-class-component';
  import Project from '@/components/Project.vue';
  import Footer from '@/components/Footer.vue';
  import Modal from '@/components/Modal.vue';
  import { shell, ipcRenderer } from 'electron';
  import pactlUtils, {
    PASink,
    PASource,
    PASinkInput,
    PASourceOutput,
    PAVirtualCable,
    PAItem
  } from '@/electron/pactlUtils';
  import LeaderLine from 'vue3-leaderline';

  interface VisualCable {
    input: PAItem;
    output: PAItem;
    line: LeaderLine;
  };

  interface NodeInfo {
    side: 0 | 1;
    index: number;
  }

  @Options({
    components: {
      Project,
      Footer,
      Modal
    }
  })
  export default class Home extends Vue {
    declare $parent: any;
    declare $data: {
      sources: (PASource | PASinkInput)[];
      sinks: (PASink | PASourceOutput)[];
      virtualCables: PAVirtualCable[];
      visualCables: VisualCable[];
      currentFocusedCable:
        | PAVirtualCable
        | PASinkInput
        | PASourceOutput
        | undefined;
      changingConnection: boolean;
      connectionType: 'virtCable' | 'source' | 'sink' | undefined;
      cableID: number;
      interval: ReturnType<typeof setInterval>;
      nodeSelection: NodeInfo | undefined;
      selectedNodes: NodeInfo[];

    };
    data() {
      return {
        sources: [],
        sinks: [],
        virtualCables: [],
        visualCables: [],
        currentFocusedCable: undefined,
        changingConnection: false,
        connectionType: undefined,
        cableID: 1,
        interval: -1,
        nodeSelection: undefined,
        selectedNodes: [],
        nodeBeingChanged: undefined
      };
    }
    async mounted() {
      window.addEventListener('keydown', this.openDiscord, false);
      window.addEventListener('contextmenu', this.ctxMenu, false);
      document
        .querySelector('.wincontent')
        ?.addEventListener('scroll', this.updateLinePosition, false);
      this.$data.sources = [
        ...((await pactlUtils.fetchFromPactl('sources')) as PASource[]),
        ...((await pactlUtils.fetchFromPactl('sink-inputs')) as PASinkInput[])
      ];
      this.$data.sinks = [
        ...((await pactlUtils.fetchFromPactl('sinks')) as PASink[]),
        ...((await pactlUtils.fetchFromPactl(
          'source-outputs'
        )) as PASourceOutput[])
      ];

      this.$data.virtualCables = [...(await pactlUtils.getVirtualCables())];

      setTimeout(this.makeCables, 10);

      this.$data.interval = setInterval(this.calculateChanges, 1000);

      ipcRenderer.on('ctx-mnu-itm', (event, action) => {
        switch (action) {
          case 'virtual-node':
            (this.$refs.createVirtualNodeModal as typeof Modal).showModal();
            break;
          default:
            this.$parent.$parent.temporaryToast('Not Implemented.');
        }
      })
    }

    makeCables(hideOnCreate: boolean = false) {
      this.$data.sources.forEach((source, index) => {
        if (source instanceof PASinkInput) {
          this.$data.visualCables.push(
            {
              line: new LeaderLine(
              document.getElementById(`source${index}`) as Element,
              document.getElementById(
                `sink${this.$data.sinks.findIndex(
                  sink => sink.id === source.sink
                )}`
              ) as Element,
              {
                size: 8,
                color: '#ff0000',
                endPlug: 'behind',
                hide: hideOnCreate
              }
            ),
            input: source,
            output: this.$data.sinks.find(
                  sink => sink.id === source.sink
                ) as PAItem
            }
          );
          let lineElement = document.querySelector(
            `.leader-line > defs > path#leader-line-${this.$data
              .cableID++}-line-path`
          ) as SVGPathElement;
          lineElement.addEventListener('click', () => {
            if (this.$data.changingConnection) return;
            this.$data.currentFocusedCable = source;
            (this.$refs.manageCableModal as typeof Modal).showModal();
          });
        }
      });

      this.$data.sinks.forEach((sink, index) => {
        if (sink instanceof PASourceOutput) {
          this.$data.visualCables.push({
            line: new LeaderLine(
              document.getElementById(
                `source${this.$data.sources.findIndex(
                  source => source.id === sink.source
                )}`
              ) as Element,
              document.getElementById(`sink${index}`) as Element,
              {
                size: 8,
                color: '#0000ff',
                endPlug: 'behind',
                hide: hideOnCreate
              }
            ),
            input: this.$data.sources.find(
                  source => source.id === sink.source
                ) as PAItem,
                output: sink}
          );
          let lineElement = document.querySelector(
            `.leader-line > defs > path#leader-line-${this.$data
              .cableID++}-line-path`
          ) as SVGPathElement;
          lineElement.addEventListener('click', () => {
            if (this.$data.changingConnection) return;
            this.$data.currentFocusedCable = sink;
            (this.$refs.manageCableModal as typeof Modal).showModal();
          });
        }
      });

      this.$data.virtualCables.forEach(virtualCable => {
        let output = document.getElementById(
            `source${this.$data.sources.findIndex(
              source => virtualCable.output.source === source.id
            )}`
          ) as Element,
          input = document.getElementById(
            `sink${this.$data.sinks.findIndex(
              sink => virtualCable.input.sink === sink.id
            )}`
          ) as Element;

        this.$data.visualCables.push({
          line: new LeaderLine(output, input, {
            size: 8,
            color: '#00ff00',
            endPlug: 'behind',
            hide: hideOnCreate
          }),
          input: this.$data.sinks.find(
              sink => virtualCable.input.sink === sink.id
            ) as PAItem,
            output: this.$data.sources.find(
              source => virtualCable.output.source === source.id
            ) as PAItem
        }
        );
        let lineElement = document.querySelector(
          `.leader-line > defs > path#leader-line-${this.$data
            .cableID++}-line-path`
        ) as SVGPathElement;
        lineElement.addEventListener('click', () => {
          if (this.$data.changingConnection) return;
          this.$data.currentFocusedCable = virtualCable;
          (this.$refs.manageCableModal as typeof Modal).showModal();
        });
      });

      if (hideOnCreate) {
        this.$data.visualCables.forEach(cable => {
          cable.line.show('draw');
        });
      }
    }

    openDiscord(e: KeyboardEvent) {
      if (e.code === 'F1') {
        e.preventDefault();
        shell.openExternal('https://alekeagle.com/d');
      } else if (e.code === 'F8') {
        this.$data.visualCables.forEach(cable => {
          cable.line.endPlug = cable.line.endPlug === 'hand' ? 'behind' : 'hand';
        });
      } else if (e.code === 'KeyR') {
        this.calculateChanges();
      }
    }

    hideManageCableModal() {
      (this.$refs.manageCableModal as typeof Modal).hideModal();
      this.$data.currentFocusedCable = undefined;
    }

    beforeUnmount() {
      window.removeEventListener('keydown', this.openDiscord, false);
      window.removeEventListener('contextmenu', this.ctxMenu, false);
      document
        .querySelector('.wincontent')
        ?.removeEventListener('scroll', this.updateLinePosition, false);

        clearInterval(this.$data.interval);
    }

    forceChangeCalculation() {
      clearInterval(this.$data.interval);
      this.calculateChanges();
      this.$data.interval = setInterval(this.calculateChanges, 1000);
    }

    ctxMenu(event: Event) {
      event.preventDefault();
      ipcRenderer.send('ctx-mnu');
    }

    updateLinePosition() {
      this.$data.visualCables.forEach(cable => cable.line.position());
    }

    async updateData() {
      this.$data.sources = [
        ...((await pactlUtils.fetchFromPactl('sources')) as PASource[]),
        ...((await pactlUtils.fetchFromPactl('sink-inputs')) as PASinkInput[])
      ];
      this.$data.sinks = [
        ...((await pactlUtils.fetchFromPactl('sinks')) as PASink[]),
        ...((await pactlUtils.fetchFromPactl(
          'source-outputs'
        )) as PASourceOutput[])
      ];

      this.$data.virtualCables = [...(await pactlUtils.getVirtualCables())];

      this.$data.visualCables.forEach(cable => {
        cable.line.hide('draw', { duration: 750 });
        setTimeout(cable.line.remove, 750);
      });
      this.$data.visualCables = [];

      setTimeout(() => this.makeCables(true), 760);
    }

    deleteVirtCable() {
      (this.$data.currentFocusedCable as PAVirtualCable).delete();
      (this.$refs.manageCableModal as typeof Modal).hideModal();
      this.forceChangeCalculation();
    }

    deleteNullSink() {
      let sink: PASink;
      if (this.$data.nodeSelection?.side === 0) 
        sink = this.$data.sinks.find(a => this.$data.sources[this.$data.nodeSelection?.index as number].owner === a.owner) as PASink;
      else
        sink = this.$data.sinks[this.$data.nodeSelection?.index as number] as PASink;

      console.log(sink);
      pactlUtils.deleteNullSink(sink);
      this.forceChangeCalculation();
      (this.$refs.manageNodeModal as typeof Modal).hideModal();
    }

    async calculateChanges() {
      let oldSinks:(PASink | PASourceOutput)[] = [],
        oldSources:(PASource | PASinkInput)[] = [],
        oldVirtualCables: PAVirtualCable[];

      let mostRecentSinks:(PASink | PASourceOutput)[] = [...((await pactlUtils.fetchFromPactl('sinks')) as PASink[]), ...((await pactlUtils.fetchFromPactl('source-outputs')) as PASourceOutput[])];
      let newSinks:(PASink | PASourceOutput)[] = mostRecentSinks.filter(a => !this.$data.sinks.find(b => b.id === a.id && b.type === a.type));
      oldSinks = this.$data.sinks.filter(a => !mostRecentSinks.find(b => a.id === b.id && a.type === b.type));

      let mostRecentSources:(PASource | PASinkInput)[] = [...((await pactlUtils.fetchFromPactl('sources')) as PASource[]), ...((await pactlUtils.fetchFromPactl('sink-inputs')) as PASinkInput[])];
      let newSources:(PASource | PASinkInput)[] = mostRecentSources.filter(a => !this.$data.sources.find(b => b.id === a.id && b.type === a.type));
      oldSources = this.$data.sources.filter(a => !mostRecentSources.find(b => a.id === b.id && a.type === b.type));

      let mostRecentVirtualCables: PAVirtualCable[] = await pactlUtils.getVirtualCables();
      let newVirtualCables: PAVirtualCable[] = mostRecentVirtualCables.filter(a => !this.$data.virtualCables.find(b => b.output.type === a.output.type && b.output.id === a.output.id && b.input.type === a.input.type && b.input.id === a.input.id));
      oldVirtualCables = this.$data.virtualCables.filter(a => !mostRecentVirtualCables.find(b => a.output.type === b.output.type && a.output.id === b.output.id && a.input.type === b.input.type && a.input.id === b.input.id));

      if (newSinks.length > 0 || oldSinks.length > 0 || newSources.length > 0 || oldSources.length > 0 || newVirtualCables.length > 0 || oldVirtualCables.length > 0) this.updateData();
    }

    beginCreateVirtualCable() {
      this.$data.selectedNodes.push(this.$data.nodeSelection as NodeInfo);
      this.$data.nodeSelection = undefined;
      (this.$refs.manageNodeModal as typeof Modal).hideModal();
      this.$data.changingConnection = true;
      this.$data.connectionType = 'virtCable';
    }

    async createVirtualCable() {
      await pactlUtils.createVirtualCable(this.$data.sources[(this.$data.selectedNodes.find(a => a.side === 0) as NodeInfo).index] as PASource, this.$data.sinks[(this.$data.selectedNodes.find(b => b.side === 1) as NodeInfo).index] as PASink);
      this.$data.selectedNodes = [];
      this.$data.changingConnection = false;
      this.forceChangeCalculation();
    }

    beginChangeSourceConnection() {
      (this.$refs.manageCableModal as typeof Modal).hideModal();
      this.$data.changingConnection = true;
      this.$data.connectionType = 'source';
    }

    beginChangeSinkConnection() {
      (this.$refs.manageCableModal as typeof Modal).hideModal();
      this.$data.changingConnection = true;
      this.$data.connectionType = 'sink';
    }

    async changeConnection() {
      if (this.$data.currentFocusedCable instanceof PASinkInput) {
        await this.$data.currentFocusedCable.changeSink(this.$data.sinks[this.$data.selectedNodes[0].index] as PASink);
      }
      if (this.$data.currentFocusedCable instanceof PASourceOutput) {
        await this.$data.currentFocusedCable.changeSource(this.$data.sources[this.$data.selectedNodes[0].index] as PASource);
      }
      if (this.$data.currentFocusedCable instanceof PAVirtualCable) {
        if (this.$data.connectionType === 'sink') {
          await this.$data.currentFocusedCable.input.changeSink(this.$data.sinks[this.$data.selectedNodes[0].index] as PASink);
        }else if (this.$data.connectionType === 'source') {
          await this.$data.currentFocusedCable.output.changeSource(this.$data.sources[this.$data.selectedNodes[0].index] as PASource);
        }
      }
      this.$data.selectedNodes = [];
      this.$data.changingConnection = false;
      this.$data.connectionType = undefined;
      this.updateData();
    }

    async createVirtualNode() {
      let name = (this.$refs.virtualNodeName as HTMLInputElement).value;
      await pactlUtils.createNullSink(name);
      (this.$refs.createVirtualNodeModal as typeof Modal).hideModal();
      this.forceChangeCalculation();
    }
  }
</script>

<style>
  .manage-buttons-btn {
    justify-self: center;
  }
  p.label {
    font-size: 23px;
    margin-bottom: 5px;
  }
  p.modal-desc {
    font-size: 18px;
    margin-top: 7px;
    color: #c9c9c9;
  }
  label.container {
    margin-top: 9px;
  }

  .third-body {
    float: left;
    width: calc(100vw / 3);
  }

  .right {
    float: right;
  }

  .leader-line {
    pointer-events: none !important;
  }

  .leader-line-line-path {
    cursor: pointer;
    pointer-events: all !important;
  }

  .con_ident {
    font-size: 18px;
    margin-bottom: 0;
  }

  .cable_modal_div {
    display: inline-block;
    margin: 0 55px;
  }

  .modal_left {
    margin-left: 0;
    float: left;
  }

  .modal_right {
    margin-right: 0;
    float: right;
  }

  .cable_modal_div_container {
    display: inline-block;
  }


  .project.selected {
    box-shadow: inset #d3d3d375 0px 0px 9px 0px;
    border-color: #d3d3d375;
    background-color: #252525;
  }
</style>
