const fs = require("fs")

/**读取文件为二级制数据 */
window.getFileBufferByPath = function (path) {
    return fs.readFileSync(path);
}