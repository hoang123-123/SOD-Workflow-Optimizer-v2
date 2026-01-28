
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeBusinessRule } from '../ruleEngine';
import { SOD, SODStatus } from '../../types';
import * as FlowTriggers from '../../services/flowTriggers';

// Auto-mock the module
vi.mock('../../services/flowTriggers');

describe('Rule Engine Integration Tests', () => {

    // Mock Data
    const mockSOD: SOD = {
        id: 'SOD-001',
        detailName: 'Test Item',
        soNumber: 'SO-100',
        product: { sku: 'SKU1', name: 'Product 1' },
        qtyOrdered: 10,
        qtyDelivered: 0,
        qtyAvailable: 5,
        deliveryCount: 0,
        status: SODStatus.SHORTAGE_PENDING_SALE,
    };

    const recordId = 'REC-001';

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default mock implementation if needed
        // For example, make sure they resolve
        // Auto-mocked async functions return Promise<undefined> usually, which is fine
    });

    /**
     * TEST GROUP A: SALE DECISIONS
     */
    describe('Group A - Sale Decisions', () => {

        it('should execute Rule A1 (Ship Partial) correctly', async () => {
            const ruleId = 'A1';
            const params = { quantity: 5 };

            const result = await executeBusinessRule(ruleId, mockSOD, recordId, params);

            // Assert State Changes
            expect(result.saleDecision?.action).toBe('SHIP_PARTIAL');
            expect(result.saleDecision?.quantity).toBe(5);
            expect(result.status).toBe(SODStatus.RESOLVED);
            expect(result.sourcePlan).toBeUndefined();

            // Assert Side Effects (Flow Trigger)
            expect(FlowTriggers.notifyWarehouseOnSaleShipment).toHaveBeenCalledWith(
                mockSOD,
                5,
                recordId
            );
        });

        it('should execute Rule A2 (Wait All) correctly', async () => {
            const ruleId = 'A2';

            const result = await executeBusinessRule(ruleId, mockSOD, recordId, {});

            expect(result.saleDecision?.action).toBe('WAIT_ALL');
            expect(result.status).toBe(SODStatus.SHORTAGE_PENDING_SOURCE);
            expect(result.sourcePlan).toBeUndefined();

            expect(FlowTriggers.notifySourceOnSaleDecision).toHaveBeenCalledWith(
                mockSOD,
                recordId
            );
        });

        it('should execute Rule A3 (Cancel) correctly', async () => {
            const ruleId = 'A3';

            const result = await executeBusinessRule(ruleId, mockSOD, recordId, {});

            expect(result.saleDecision?.action).toBe('CANCEL_ORDER');
            expect(result.status).toBe(SODStatus.RESOLVED);

            expect(FlowTriggers.notifySaleCancelDecision).toHaveBeenCalledWith(
                mockSOD,
                recordId
            );
        });
    });

    /**
     * TEST GROUP B: SOURCE ACTIONS & EXCEPTIONS
     */
    describe('Group B - Source & Warehouse', () => {

        it('should execute Rule SRC_CONFIRM correctly', async () => {
            const ruleId = 'SRC_CONFIRM';
            const params = { eta: '2025-12-31', supplier: 'Vendor X' };
            const pendingSourceSOD = { ...mockSOD, status: SODStatus.SHORTAGE_PENDING_SOURCE };

            const result = await executeBusinessRule(ruleId, pendingSourceSOD, recordId, params);

            expect(result.sourcePlan?.status).toBe('CONFIRMED');
            expect(result.sourcePlan?.eta).toBe('2025-12-31');
            expect(result.sourcePlan?.supplier).toBe('Vendor X');
            expect(result.status).toBe(SODStatus.RESOLVED);

            expect(FlowTriggers.notifySaleOnSourcePlan).toHaveBeenCalled();
        });

        it('should execute Rule WH_REPORT (Warehouse Discrepancy) correctly', async () => {
            const ruleId = 'WH_REPORT';
            const params = { actualQty: 3, requestedQty: 5, discrepancyType: 'INVENTORY' as const };

            const result = await executeBusinessRule(ruleId, mockSOD, recordId, params);

            expect(result.warehouseVerification?.actualQty).toBe(3);
            expect(result.warehouseVerification?.discrepancyType).toBe('INVENTORY');
            expect(result.isNotificationSent).toBe(true);

            expect(FlowTriggers.notifySaleOnShortage).toHaveBeenCalled();
        });

        it('should execute Rule WH_CONFIRM correctly', async () => {
            const ruleId = 'WH_CONFIRM';

            const result = await executeBusinessRule(ruleId, mockSOD, recordId, {});

            expect(result.warehouseConfirmation?.status).toBe('CONFIRMED');
            expect(result.status).toBe(SODStatus.RESOLVED);

            // Using expect.anything() because the first arg (sod) is cloned inside the function
            expect(FlowTriggers.notifySaleOnWarehouseConfirmation).toHaveBeenCalledWith(
                expect.anything(), 'CONFIRMED', undefined, recordId
            );
            expect(FlowTriggers.notifyPickingDeptOnSubmit).toHaveBeenCalled();
        });
    });

    /**
     * EDGE CASES
     */
    describe('Edge Cases', () => {
        it('should throw error for invalid rule ID', async () => {
            await expect(executeBusinessRule('INVALID_ID', mockSOD, recordId, {}))
                .rejects
                .toThrow("Rule ID 'INVALID_ID' not found");
        });
    });

});
