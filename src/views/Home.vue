<template>
  <div ref="first" class="projects third-body">
    <Project
      v-for="(source, index) in sources"
      :key="`${source.type}${source.id}`"
      :classes="['auth']"
      :id="'source' + index"
      :title="
        source.description ? source.description : source.properties.media.name
      "
    >
    </Project>
    &nbsp;
  </div>
  <div ref="second" class="projects third-body right">
    <Project
      v-for="(sink, index) in sinks"
      :classes="['auth']"
      :id="'sink' + index"
      :key="`${sink.type}${sink.id}`"
      :title="sink.description ? sink.description : sink.properties.media.name"
    >
    </Project>
    &nbsp;
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
    </div>
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
    PAVirtualCable
  } from '@/electron/pactlUtils';
  import LeaderLine from 'vue3-leaderline';

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
      visualCables: LeaderLine[];
      currentFocusedCable:
        | PAVirtualCable
        | PASinkInput
        | PASourceOutput
        | undefined;
      changingConnection: boolean;
      cableID: number;
    };
    data() {
      return {
        sources: [],
        sinks: [],
        virtualCables: [],
        visualCables: [],
        currentFocusedCable: undefined,
        changingConnection: false,
        cableID: 1
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
    }

    makeCables(hideOnCreate: boolean = false) {
      this.$data.sources.forEach((source, index) => {
        if (source instanceof PASinkInput) {
          this.$data.visualCables.push(
            new LeaderLine(
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
            )
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
          this.$data.visualCables.push(
            new LeaderLine(
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
            )
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

        this.$data.visualCables.push(
          new LeaderLine(output, input, {
            size: 8,
            color: '#00ff00',
            endPlug: 'behind',
            hide: hideOnCreate
          })
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
          cable.show('draw');
        });
      }
    }

    openDiscord(e: KeyboardEvent) {
      if (e.code === 'F1') {
        e.preventDefault();
        shell.openExternal('https://alekeagle.com/d');
      } else if (e.code === 'F8') {
        this.$data.visualCables.forEach(cable => {
          cable.endPlug = cable.endPlug === 'hand' ? 'behind' : 'hand';
        });
      } else if (e.code === 'KeyR') {
        this.updateData();
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
    }

    ctxMenu(event: Event) {
      event.preventDefault();
      ipcRenderer.send('ctx-mnu');
    }

    updateLinePosition() {
      this.$data.visualCables.forEach(cable => cable.position());
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
        cable.hide('draw', { duration: 750 });
        setTimeout(cable.remove, 750);
      });
      this.$data.visualCables = [];

      setTimeout(() => this.makeCables(true), 760);

      console.log('beeeeep');
    }

    deleteVirtCable() {
      (this.$data.currentFocusedCable as PAVirtualCable).delete();
      (this.$refs.manageCableModal as typeof Modal).hideModal();
      this.updateData();
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
</style>
