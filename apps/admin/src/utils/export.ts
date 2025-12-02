import * as XLSX from 'xlsx';

/**
 * 导出数据到Excel文件
 * @param data 要导出的数据数组
 * @param filename 文件名（不含扩展名）
 * @param sheetName 工作表名称
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Data') => {
    try {
        // 创建工作表
        const worksheet = XLSX.utils.json_to_sheet(data);

        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 生成文件
        const timestamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);

        return true;
    } catch (error) {
        console.error('导出Excel失败:', error);
        return false;
    }
};

/**
 * 批量执行异步操作
 * @param items 要处理的项目列表
 * @param action 对每个项目执行的操作
 * @param onProgress 进度回调
 */
export const batchExecute = async <T>(
    items: T[],
    action: (item: T) => Promise<void>,
    onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
        try {
            await action(items[i]);
            success++;
        } catch (error) {
            console.error(`操作失败:`, error);
            failed++;
        }

        if (onProgress) {
            onProgress(i + 1, items.length);
        }
    }

    return { success, failed };
};
