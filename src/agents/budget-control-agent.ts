/**
 * Budget & Spend Control Agent
 *
 * Responsibility: Maintain financial clarity without degrading experience quality
 *
 * Based on Section 11D from asia_golf_culture_itinerary.md
 */

import { BaseAgent, AgentContext, AgentRecommendation } from './base-agent';
import { Trip } from '../types/schema';

interface BudgetControlContext extends AgentContext {
  trip: Trip;
  categorySpend: Record<string, { planned: number; actual: number }>;
  upcomingExpenses?: Array<{
    category: string;
    amount: number;
    description: string;
  }>;
  unusedPrepaid?: Array<{
    category: string;
    amount: number;
    item: string;
  }>;
}

export class BudgetControlAgent extends BaseAgent {
  private readonly ALERT_THRESHOLD = 0.10; // 10% variance
  private readonly CRITICAL_THRESHOLD = 0.20; // 20% variance

  constructor() {
    super('budget_control', 'Budget & Spend Control Agent');
  }

  async analyze(context: BudgetControlContext): Promise<AgentRecommendation> {
    this.validateContext(context, ['tripId', 'userId', 'date', 'trip', 'categorySpend']);

    const signals = this.collectSignals(context);
    const variances = this.calculateVariances(context);

    this.log('info', 'Analyzing budget control', { signals, variances });

    // Check for critical overruns
    const criticalOverruns = this.findCriticalOverruns(variances);
    if (criticalOverruns.length > 0) {
      return this.recommendCriticalAction(criticalOverruns, signals, context);
    }

    // Check for category overruns
    const overruns = this.findOverruns(variances);
    if (overruns.length > 0) {
      return this.recommendBudgetAdjustment(overruns, signals, context);
    }

    // Check for unused prepaid value
    if (context.unusedPrepaid && context.unusedPrepaid.length > 0) {
      return this.recommendPrepaidUtilization(context.unusedPrepaid, signals);
    }

    // Budget tracking looks good
    return this.createRecommendation(
      'Budget on track - no adjustments needed',
      this.buildSummary(signals, variances),
      signals,
      [],
      { priority: 'low' }
    );
  }

  private collectSignals(context: BudgetControlContext): Record<string, any> {
    const trip = context.trip;
    return {
      totalBudget: trip.budget.total,
      totalSpent: trip.budget.spent,
      remainingBudget: trip.budget.total - trip.budget.spent,
      percentSpent: (trip.budget.spent / trip.budget.total) * 100,
      categoryCount: Object.keys(context.categorySpend).length,
      upcomingExpensesCount: context.upcomingExpenses?.length || 0,
      unusedPrepaidCount: context.unusedPrepaid?.length || 0,
    };
  }

  private calculateVariances(
    context: BudgetControlContext
  ): Array<{
    category: string;
    planned: number;
    actual: number;
    variance: number;
    variancePercent: number;
  }> {
    return Object.entries(context.categorySpend).map(([category, spend]) => {
      const variance = spend.actual - spend.planned;
      const variancePercent = spend.planned > 0 ? variance / spend.planned : 0;

      return {
        category,
        planned: spend.planned,
        actual: spend.actual,
        variance,
        variancePercent,
      };
    });
  }

  private findOverruns(
    variances: ReturnType<typeof this.calculateVariances>
  ): typeof variances {
    return variances.filter(v => v.variancePercent > this.ALERT_THRESHOLD);
  }

  private findCriticalOverruns(
    variances: ReturnType<typeof this.calculateVariances>
  ): typeof variances {
    return variances.filter(v => v.variancePercent > this.CRITICAL_THRESHOLD);
  }

  private recommendCriticalAction(
    criticalOverruns: ReturnType<typeof this.calculateVariances>,
    signals: Record<string, any>,
    context: BudgetControlContext
  ): AgentRecommendation {
    const details = criticalOverruns
      .map(c => `${c.category}: ${(c.variancePercent * 100).toFixed(1)}% over budget`)
      .join('; ');

    const actions = [
      'URGENT: Review and approve continued spending',
      ...criticalOverruns.map(c =>
        `${c.category}: planned ${c.planned}, actual ${c.actual} (${c.variance > 0 ? '+' : ''}${c.variance})`
      ),
      'Consider reallocating from other categories',
      'Evaluate whether to adjust remaining trip plans',
    ];

    // Suggest specific reallocations
    const underbudget = this.findUnderbudgetCategories(context);
    if (underbudget.length > 0) {
      actions.push('', 'Potential reallocation sources:');
      underbudget.forEach(cat => {
        actions.push(`- ${cat.category}: ${cat.available} available`);
      });
    }

    return this.createRecommendation(
      'CRITICAL: Budget overrun detected',
      `Critical variance detected: ${details}. Total budget at ${signals.percentSpent.toFixed(1)}% utilized.`,
      signals,
      actions,
      {
        approvalRequired: true,
        priority: 'critical',
      }
    );
  }

  private recommendBudgetAdjustment(
    overruns: ReturnType<typeof this.calculateVariances>,
    signals: Record<string, any>,
    context: BudgetControlContext
  ): AgentRecommendation {
    const details = overruns
      .map(c => `${c.category}: ${(c.variancePercent * 100).toFixed(1)}% over`)
      .join('; ');

    const actions = [
      'Review category spending patterns',
      ...overruns.map(c =>
        `${c.category}: variance of ${c.variance} (${(c.variancePercent * 100).toFixed(1)}%)`
      ),
    ];

    // Recommend reallocations
    const underbudget = this.findUnderbudgetCategories(context);
    if (underbudget.length > 0) {
      actions.push('', 'Recommended reallocations:');

      // Match overruns with underbudget categories
      overruns.forEach(over => {
        const source = underbudget.find(u => u.available >= Math.abs(over.variance));
        if (source) {
          actions.push(
            `- Reallocate ${Math.abs(over.variance)} from ${source.category} to ${over.category}`
          );
        }
      });
    } else {
      actions.push('', 'No underbudget categories available for reallocation');
      actions.push('Consider reducing upcoming discretionary expenses');
    }

    return this.createRecommendation(
      'Budget variance detected - adjustment recommended',
      `Category overruns detected: ${details}. Reallocation recommended to maintain overall budget.`,
      signals,
      actions,
      {
        approvalRequired: true,
        priority: 'high',
      }
    );
  }

  private recommendPrepaidUtilization(
    unusedPrepaid: BudgetControlContext['unusedPrepaid'],
    signals: Record<string, any>
  ): AgentRecommendation {
    const totalUnused = unusedPrepaid!.reduce((sum, item) => sum + item.amount, 0);

    const actions = [
      `Total unused prepaid value: ${totalUnused}`,
      '',
      'Unutilized items:',
      ...unusedPrepaid!.map(item =>
        `- ${item.item} (${item.category}): ${item.amount}`
      ),
      '',
      'Recommended actions:',
      'Review whether these items can still be used',
      'Consider booking alternative experiences of equal value',
      'Document items that cannot be recovered',
    ];

    return this.createRecommendation(
      'Unused prepaid value detected',
      `${totalUnused} in prepaid expenses not yet utilized. ` +
      'Review opportunities to use or reallocate this value.',
      signals,
      actions,
      {
        approvalRequired: false,
        priority: 'medium',
      }
    );
  }

  private findUnderbudgetCategories(
    context: BudgetControlContext
  ): Array<{ category: string; available: number }> {
    return Object.entries(context.categorySpend)
      .filter(([_, spend]) => spend.actual < spend.planned)
      .map(([category, spend]) => ({
        category,
        available: spend.planned - spend.actual,
      }))
      .sort((a, b) => b.available - a.available);
  }

  private buildSummary(
    signals: Record<string, any>,
    variances: ReturnType<typeof this.calculateVariances>
  ): string {
    const lines = [
      `Total budget: ${signals.totalBudget}, Spent: ${signals.totalSpent} (${signals.percentSpent.toFixed(1)}%)`,
      `Remaining: ${signals.remainingBudget}`,
    ];

    const onTrack = variances.filter(v => Math.abs(v.variancePercent) <= this.ALERT_THRESHOLD);
    if (onTrack.length > 0) {
      lines.push(`${onTrack.length} categories on track`);
    }

    return lines.join('. ');
  }
}
