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
      v-for="sink in sinks"
      :classes="['auth']"
      :id="'source' + index"
      :key="`${sink.type}${sink.id}`"
      :title="sink.description ? sink.description : sink.properties.media.name"
    >
    </Project>
    &nbsp;
  </div>
  <Footer />
</template>

<script lang="ts">
  import { mapGetters, mapMutations, MutationMethod } from 'vuex';
  import { Vue, Options } from 'vue-class-component';
  import Project from '@/components/Project.vue';
  import Footer from '@/components/Footer.vue';
  import Modal from '@/components/Modal.vue';
  import { shell, ipcRenderer } from 'electron';
  import pactlUtils, { PactlItem, PactlType } from '@/electron/pactlUtils';
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
      sources: PactlItem[];
      sinks: PactlItem[];
    };
    data() {
      return {
        sources: [],
        sinks: []
      };
    }
    async mounted() {
      window.addEventListener('contextmenu', this.ctxMenu, false);
      this.$data.sources = [
        ...(await pactlUtils.getSources()),
        ...(await pactlUtils.getSinkInputs())
      ];
      this.$data.sinks = [
        ...(await pactlUtils.getSinks()),
        ...(await pactlUtils.getSourceOutputs())
      ];

      this.$data.sources.forEach((v, i, a) => {});
      console.log(...this.$data.sinks, ...this.$data.sources);
    }

    openDiscord(e: KeyboardEvent) {
      if (e.code === 'F1') {
        e.preventDefault();
        shell.openExternal('https://alekeagle.com/d');
      }
    }

    beforeUnmount() {
      window.removeEventListener('keydown', this.openDiscord, false);
      window.removeEventListener('contextmenu', this.ctxMenu, false);
    }

    ctxMenu(event: Event) {
      event.preventDefault();
      ipcRenderer.send('ctx-mnu');
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
</style>
