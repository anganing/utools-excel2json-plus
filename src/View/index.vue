<template>
  <n-config-provider :theme="theme">
    <div class="p-20px h-100vh box-border relative">
      <div class="app-card  w-[calc(100%-10px)] h-[calc(100%-10px)]">
        <!-- 顶部 上传文件用 -->
        <div class="card-header">
          <div class="uploader-container">
            <n-upload accept=".xls,.xlsx" :default-upload="false" :show-file-list="false"
              :on-change="fileChangeHandler">
              <n-upload-dragger>
                <div class="mb-8px">
                  <n-icon size="30" :depth="3">
                    <archive-icon color="#25b39eb8" />
                  </n-icon>
                </div>
                <n-text class="text-size-[16px]">
                  点击或者拖动文件到该区域
                </n-text>
                <n-p depth="3" class="mt-8px">
                  支持转换.xls 或 .xlsx格式的文件
                </n-p>
              </n-upload-dragger>
            </n-upload>
          </div>
        </div>

        <n-divider />

        <!-- 下方，结果输出展示用 -->
        <div class="result h-full flex flex-col">
          <div class="mb-5px flex justify-between">
            <div class="options-left flex items-center">
              <!-- <label class="ml-10px">
                JSON格式化
                <n-switch v-model:value="isFormatter" :disabled="!jsonValue" />
              </label> -->

                  <!-- 指定表名转换 -->
              <n-select size="small" class="w-300px" clearable multiple placeholder="指定表名转换"
                v-model:value="exportNameValue" :options="exportNameOptions" v-show="exportNameOptions.length" />

            </div>

            <div class="options-right flex items-center">

              <!-- 复制结果 -->
              <n-button size="small" strong secondary  type="primary" class="copy-text-btn ml-10px" :data-clipboard-text="jsonValue"
                :disabled="!jsonValue" >
                {{ copyBtnText }}
              </n-button>

              <!-- JSON转换增强 -->
              <n-button size="small" strong secondary  type="primary" class="ml-10px"
                        :disabled="!jsonValue" @click="toCustomizeJSONEditHandler" >
                JSON转换增强
              </n-button>

              <!-- JSON编辑器 -->
              <n-button size="small" strong secondary  type="primary" class="ml-10px"
                :disabled="!jsonValue" @click="toJSONEditHandler" >
                JSON编辑器
              </n-button>

              <!--  清空结果 -->
              <n-button size="small" strong secondary  type="error" class="ml-10px" :disabled="!jsonValue"
                @click="clearResultHandler" >
                清空结果
              </n-button>
            </div>
          </div>

          <!-- 输出json代码 -->
          <!-- 压缩单行超过一万字符的代码不高亮显示 -->
          <pre v-if="!isFormatter && jsonValue.length > 10000"
            class="json-container flex-1 overflow-y-auto">{{ jsonValue }}</pre>
          <HighLightJs v-else language="json" :code="jsonValue" class="json-container flex-1 overflow-y-auto" />
        </div>
      </div>

      <n-icon size="20" class="setting-icon absolute right-10px bottom-10px cursor-pointer"
       color="#25b39e"
       @click="openSettingHandler">
        <settingIcon class="text-size-(20px)" />
      </n-icon>
    </div>

    <!-- 设置抽屉 -->
    <n-drawer v-model:show="showDrawer" :width="300" placement="right">
      <n-drawer-content title="自定义">
        <SettingModal ref="settingModalRef" />
      </n-drawer-content>
    </n-drawer>

    <!-- JSON转换增强抽屉 -->
    <n-drawer v-model:show="showCustomizeDrawer" :width="800" placement="right">
      <n-drawer-content title="自定义JSON转换">
        <n-input
            v-model:value="code"
            type="textarea"
            clearable
            autosize
            placeholder="请输入你的js转换脚本..."
        />
        <n-button type="primary" @click="doCustomizeJSONEdit">转换</n-button>
      </n-drawer-content>

    </n-drawer>
  </n-config-provider>
</template>

<script setup>
// import { FileExcelTwotone as ArchiveIcon, SettingOutlined as settingIcon } from "@vicons/antd";
import { SettingOutlined as settingIcon } from "@vicons/antd";
import { CloudUploadSharp as ArchiveIcon } from "@vicons/ionicons5";
import {useOsTheme, darkTheme, useNotification} from "naive-ui";
import { storeToRefs } from "pinia"

import SettingModal from "./components/SettingModal.vue"
import useCopy from "./useCopy";
import useHeightLight from "./useHeightLight";
import useReadExcel from "./useReadExcel";
import useUtools from "./useUtools";
import useShowJson from "./useShowJson";
import useDark from "./useDark";
import { useSetting } from "@/stores/setting"

const notification = useNotification();

const showCustomizeDrawer = ref(false)
const code = ref(`(rawExcelJsonStr) => {
  const rawExcelJson = JSON.parse(rawExcelJsonStr);

  // 最终数据
  let result = []

  const workOrders = rawExcelJson.workOrders || [];
  const wipComponent = rawExcelJson?.wipComponent ||[];
  const wipOperation = rawExcelJson?.wipOperation || [];
  const wipResource = rawExcelJson.wipResource || [];

  // 遍历工单找到对应的 组件、工序、资源
  workOrders.forEach((workOrder) => {
    const obj =  {
      ...workOrder,
      wipComponent: wipComponent?.filter((c) => c.workNumId == workOrder?.workNumId),
      wipOperation: wipOperation.filter((p) => p.workNumId == workOrder?.workNumId),
      wipResource: wipResource.filter((r) => r.workNumId == workOrder?.workNumId)
    }
    result.push(obj);
  })

  return JSON.stringify(result);
}`)
const doCustomizeJSONEdit = () => {
  if (!code.value) {
    notification.error({
      content: "脚本不能为空",
      duration: 1000
    });
    return;
  }

  let convertStrJsonValue = jsonValue.value;
  try {
    const rawExcelJsonStr = jsonValue.value;
    // 执行用户自定义的函数代码
    const fn = eval('(' + code.value + ')');
    convertStrJsonValue = fn(rawExcelJsonStr);
    console.log("convertStrJsonValue", convertStrJsonValue);
  } catch (e) {
    console.log(e)
    notification.error({
      content: JSON.stringify(e),
      duration: 5000
    });
  }
  toJsonEdit(convertStrJsonValue)
}

const {
  // 自动格式化
  jsonFormatt: isFormatter,
} = storeToRefs(useSetting())


const osThemeRef = useOsTheme();
const theme = computed(() => (osThemeRef.value === "dark" ? darkTheme : null));

// 导出表名
const exportNameValue = ref([]);

// 设置抽屉
const showDrawer = ref(false)
const settingModalRef = ref();
function openSettingHandler() {
  showDrawer.value = true
  nextTick(() => {

    console.log("settingModalRef:", settingModalRef);
    settingModalRef.value.initData()
  })
}

const { isDark } = useDark();

const { HighLightJs } = useHeightLight(isDark);
const { runFileRead, sheetNames, excelvalue, renderFileByNode, clearResult } =
  useReadExcel(exportNameValue);

const { showMainWindow, hideMainWindow,toJsonEdit } = useUtools(
  sheetNames,
  excelvalue,
  exportNameValue,
  renderFileByNode
);

const { copyBtnText, initClipboard } = useCopy(clearResult, hideMainWindow);



const { jsonValue } = useShowJson(isFormatter, excelvalue, exportNameValue);

// 可选表名
const exportNameOptions = computed(() => {
  return sheetNames.value.map((item) => {
    return {
      label: item,
      value: item,
    };
  });
});



const styles = computed(() => {
  const light = !isDark.value;
  return {
    codeBg: light ? "#fafafa" : "#282c34",
    cardShadow: light
      ? "0 0 12px 0px rgba(0, 0, 0, .25)"
      : "0 0 12px 0px rgba(0, 0, 0, 1)",
    codeColor: light ? "#666" : "#aaa",
  };
});

/**文件上传变化回调 */
function fileChangeHandler(data) {
  // 跳回主窗口
  showMainWindow();
  // 文件校验及转换
  runFileRead(data);
}

/**清空转换结果 */
function clearResultHandler() {
  // 清空json最原始数据
  clearResult()
}

function toJSONEditHandler(){
  toJsonEdit(jsonValue.value)
}

/**
 * 自定义转换 JSON
 */
const toCustomizeJSONEditHandler = () => {
  showCustomizeDrawer.value = true
}

onMounted(() => {
  initClipboard();
});
</script>

<style scoped lang="scss">
// 卡片样式
.app-card {
  display: flex;
  flex-direction: column;
  padding: 10px;
  // box-shadow: 0 0 12px 0px rgba(0, 0, 0, 1);
  box-shadow: v-bind("styles.cardShadow");

  .result {
    flex: 1;
    overflow: hidden;
  }
}

//转换文件容器
.uploader-container {
  :deep() {
    .n-upload-trigger {
      width: 100%;

      .n-upload-dragger {
        padding: 10px;
        
      }
    }
  }
}

.json-container {
  // background-color: #fafafa;
  background-color: v-bind("styles.codeBg");
  // color: #666;
  color: v-bind("styles.codeColor");
  font-size: 14px;
  line-height: 1.5em;
  box-sizing: border-box;

  // height: 400px;
  // overflow-y: auto;
}

// 设置按钮
.setting-icon {
  transition: transform .5s;

  &:hover {
    transform: rotate(90deg);
  }
}
</style>
