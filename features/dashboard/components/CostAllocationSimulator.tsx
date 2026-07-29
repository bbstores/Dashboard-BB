"use client";

import { useState } from "react";
import { formatCurrency, formatNumber } from "@/shared/formatting/format";
import {
  simulateCostAllocations,
  type CostSimulationRow,
  type CostSimulationResult,
} from "../analytics/simulateCostAllocation";
import type { CostAllocation } from "../model/types";

type BillDraft = {
  billId: string;
  billTitle: string;
  approvalLink: string;
  status: string;
  classification: CostAllocation["classification"];
  totalAmount: string;
  unitAmount: string;
  rowsText: string;
};

const DEFAULT_BILLS: BillDraft[] = [
  {
    billId: "BILL-BST-01",
    billTitle: "Chi phí sản xuất BST 08.2026",
    approvalLink: "https://approval.demo/bst-01",
    status: "Đã Thanh Toán",
    classification: "Bộ Sưu Tập",
    totalAmount: "24000000",
    unitAmount: "12000000",
    rowsText: [
      "08.2026-Tiệc | TSK001 | Chụp lookbook Tiệc",
      "08.2026-Tiệc | TSK002 | Edit ảnh Tiệc",
      "08.2026-Tiệc | TSK003 | Video BST Tiệc",
      "08.2026-Công sở | TSK003 | Video BST Tiệc",
      "08.2026-Công sở | TSK004 | Chụp lookbook Công sở",
    ].join("\n"),
  },
  {
    billId: "BILL-CA-01",
    billTitle: "Chi phí hai ca quay tháng 8",
    approvalLink: "https://approval.demo/ca-01",
    status: "Đã Thanh Toán",
    classification: "Ca Quay",
    totalAmount: "10000000",
    unitAmount: "5000000",
    rowsText: [
      "CA-01 | TSK001 | Chụp lookbook Tiệc",
      "CA-01 | TSK005 | Video hậu trường",
      "CA-02 | TSK002 | Edit ảnh Tiệc",
      "CA-02 | TSK005 | Video hậu trường",
    ].join("\n"),
  },
  {
    billId: "BILL-SP-01",
    billTitle: "Chi phí mẫu theo mã sản phẩm",
    approvalLink: "https://approval.demo/sp-01",
    status: "Đã Thanh Toán",
    classification: "Mã Sản Phẩm",
    totalAmount: "1800000",
    unitAmount: "600000",
    rowsText: [
      "SP001 | TSK001 | Chụp lookbook Tiệc",
      "SP001 | TSK002 | Edit ảnh Tiệc",
      "SP002 | TSK003 | Video BST Tiệc",
      "SP003 | TSK006 | Thiết kế banner sản phẩm",
    ].join("\n"),
  },
  {
    billId: "BILL-TASK-01",
    billTitle: "Chi phí phát sinh theo task",
    approvalLink: "https://approval.demo/task-01",
    status: "Đã Thanh Toán",
    classification: "Task",
    totalAmount: "3600000",
    unitAmount: "900000",
    rowsText: [
      "TSK004 | TSK004 | Chụp lookbook Công sở",
      "TSK006 | TSK006 | Thiết kế banner sản phẩm",
      "TSK007 | TSK007 | Retouch ảnh chiến dịch",
      "TSK-CHUA-LINK |  | ",
    ].join("\n"),
  },
];

function parseRows(value: string): CostSimulationRow[] {
  return value
    .split("\n")
    .map((line) => {
      const [entity = "", taskCode = "", ...titleParts] =
        line.split("|");
      return {
        entity: entity.trim(),
        taskCode: taskCode.trim(),
        taskTitle: titleParts.join("|").trim(),
      };
    })
    .filter((row) => row.entity || row.taskCode || row.taskTitle);
}

function entityCount(rowsText: string) {
  return new Set(
    parseRows(rowsText)
      .map((row) => row.entity.trim().toLocaleLowerCase("vi"))
      .filter(Boolean),
  ).size;
}

export function CostAllocationSimulator() {
  const [bills, setBills] = useState<BillDraft[]>(DEFAULT_BILLS);
  const [result, setResult] =
    useState<CostSimulationResult | null>(null);

  function updateBill(index: number, patch: Partial<BillDraft>) {
    setBills((current) =>
      current.map((bill, billIndex) =>
        billIndex === index ? { ...bill, ...patch } : bill,
      ),
    );
  }

  function runSimulation() {
    setResult(
      simulateCostAllocations(
        bills.map((bill) => ({
          ...bill,
          totalAmount: Number(bill.totalAmount),
          unitAmount: Number(bill.unitAmount),
          rows: parseRows(bill.rowsText),
        })),
      ),
    );
  }

  return (
    <section className="costSimulator">
      <div className="costSimulatorHeading">
        <div>
          <span className="chartKicker">CÔNG CỤ KIỂM THỬ</span>
          <h3>Giả lập phân bổ chi phí</h3>
        </div>
        <small>4 bill mẫu · dữ liệu chỉ tồn tại trong cửa sổ này.</small>
      </div>
      <div className="costSimulatorBills">
        {bills.map((bill, index) => (
          <fieldset className="costSimulatorBill" key={bill.classification}>
            <legend>
              Bill {index + 1} · {bill.classification}
            </legend>
            <div className="costSimulatorForm">
              <label>
                Mã bill
                <input
                  value={bill.billId}
                  onChange={(event) =>
                    updateBill(index, { billId: event.target.value })
                  }
                />
              </label>
              <label>
                Tên bill
                <input
                  value={bill.billTitle}
                  onChange={(event) =>
                    updateBill(index, { billTitle: event.target.value })
                  }
                />
              </label>
              <label>
                Link Approval
                <input
                  value={bill.approvalLink}
                  onChange={(event) =>
                    updateBill(index, { approvalLink: event.target.value })
                  }
                />
              </label>
              <label>
                Trạng thái thanh toán
                <select
                  value={bill.status}
                  onChange={(event) =>
                    updateBill(index, { status: event.target.value })
                  }
                >
                  <option>Đã Thanh Toán</option>
                  <option>Chờ Thanh Toán</option>
                  <option>Huỷ</option>
                </select>
              </label>
              <label>
                Phân loại
                <select
                  value={bill.classification}
                  onChange={(event) =>
                    updateBill(index, {
                      classification: event.target
                        .value as CostAllocation["classification"],
                    })
                  }
                >
                  <option>Bộ Sưu Tập</option>
                  <option>Ca Quay</option>
                  <option>Mã Sản Phẩm</option>
                  <option>Task</option>
                </select>
              </label>
              <label>
                Tổng tiền bill
                <input
                  min="0"
                  step="1000"
                  type="number"
                  value={bill.totalAmount}
                  onChange={(event) =>
                    updateBill(index, { totalAmount: event.target.value })
                  }
                />
              </label>
              <label>
                Thành Tiền / Đơn vị (từ Lark)
                <input
                  min="0"
                  step="1000"
                  type="number"
                  value={bill.unitAmount}
                  onChange={(event) =>
                    updateBill(index, { unitAmount: event.target.value })
                  }
                />
              </label>
              <label>
                Thành tiền / đơn vị kỳ vọng
                <output className="costSimulatorCalculated">
                  {entityCount(bill.rowsText)
                    ? formatCurrency(
                        Number(bill.totalAmount) /
                          entityCount(bill.rowsText),
                      )
                    : "Chưa có đơn vị"}
                </output>
              </label>
              <label className="costSimulatorRows">
                Đơn vị | Mã task | Tên task
                <textarea
                  rows={5}
                  value={bill.rowsText}
                  onChange={(event) =>
                    updateBill(index, { rowsText: event.target.value })
                  }
                />
              </label>
            </div>
          </fieldset>
        ))}
      </div>
      <p className="costSimulationFootnote">
        Kịch bản có task nhận tiền từ nhiều bill và một đơn vị
        TSK-CHUA-LINK chưa có task để kiểm tra phần chưa phân bổ. Tổng tiền
        mỗi bill được chia đều theo số đơn vị trước khi chia tiếp cho task.
      </p>
      <button
        type="button"
        className="costSimulatorSubmit"
        onClick={runSimulation}
      >
        Xác nhận và xem bảng giả lập
      </button>

      {result && (
        <div
          className="costSimulationOverlay"
          role="presentation"
          onMouseDown={() => setResult(null)}
        >
          <aside
            className="costSimulationDialog"
            role="dialog"
            aria-modal="true"
            aria-label="Kết quả giả lập phân bổ chi phí"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="chartKicker">BẢNG DẪN CHỨNG GIẢ LẬP</span>
                <h3>Kết quả phân bổ theo task</h3>
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                aria-label="Đóng kết quả giả lập"
              >
                ×
              </button>
            </header>
            {result.errors.length ? (
              <div className="costSimulationErrors">
                {result.errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : (
              <>
                {result.warnings.length > 0 && (
                  <div className="costSimulationErrors">
                    {result.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                )}
                <div className="costSimulationAudit">
                  <span>
                    <small>Tổng phiếu</small>
                    <strong>{formatCurrency(result.proposalTotal)}</strong>
                  </span>
                  <span>
                    <small>Đã phân bổ</small>
                    <strong>{formatCurrency(result.allocatedTotal)}</strong>
                  </span>
                  <span>
                    <small>Chưa phân bổ</small>
                    <strong>{formatCurrency(result.unallocatedTotal)}</strong>
                  </span>
                  <span>
                    <small>Đối soát</small>
                    <strong>{result.isReconciled ? "PASS" : "FAIL"}</strong>
                  </span>
                </div>
                <div className="costSimulationTableWrap">
                  <table className="detailTable costTaskSummaryTable">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã task</th>
                        <th>Tên task</th>
                        <th>Mã bill</th>
                        <th>Tên bill</th>
                        <th>Tổng tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.summaries.map((row, index) => (
                        <tr key={`${row.task.code}-${index}`}>
                          <td>{index + 1}</td>
                          <td className="costTaskCode">
                            <strong>{row.task.code}</strong>
                          </td>
                          <td>{row.task.title || "Chưa có tên task"}</td>
                          <td>
                            <div className="costBillList costBillCodes">
                              {row.bills.map((bill) => (
                                <span key={bill.id}>{bill.id}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div className="costBillList costBillNames">
                              {row.bills.map((bill) => (
                                <span key={bill.id}>{bill.title}</span>
                              ))}
                            </div>
                          </td>
                          <td className="costAmountCell">
                            <strong>
                              {formatCurrency(row.totalAmount)}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!result.summaries.length && (
                    <p className="detailEmpty">
                      Không có task nào nhận phân bổ.
                    </p>
                  )}
                </div>
                <p className="costSimulationFootnote">
                  {formatNumber(result.summaries.length)} task · Mỗi đơn vị
                  nhận “Tổng tiền bill ÷ số đơn vị”, sau đó số tiền của đơn
                  vị được chia đều cho các task duy nhất thuộc đơn vị đó.
                </p>
              </>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
