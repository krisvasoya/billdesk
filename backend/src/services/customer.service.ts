// backend/src/services/customer.service.ts
import { customerRepository, type CustomerWithOutstanding } from '../repositories/customer.repository';
import { activityLogRepository } from '../repositories/activity-log.repository';
import type { Customer } from '@prisma/client';

export const customerService = {
  async getCustomers(
    shopId: string,
    params: { search?: string; page?: number; pageSize?: number }
  ): Promise<{ data: CustomerWithOutstanding[]; total: number }> {
    return customerRepository.findAll(shopId, params);
  },

  async getCustomerById(shopId: string, id: string): Promise<CustomerWithOutstanding | null> {
    return customerRepository.findById(shopId, id);
  },

  async createCustomer(
    shopId: string,
    userId: string,
    data: {
      customerName: string;
      mobile?: string;
      email?: string;
      address?: string;
      gstNumber?: string;
      openingBalance?: number;
      creditLimit?: number;
      notes?: string;
    }
  ): Promise<Customer> {
    const customer = await customerRepository.create(shopId, data);

    await activityLogRepository.log({
      shopId,
      userId,
      action: 'CUSTOMER_CREATED',
      details: `Customer ${customer.customerName} created successfully`,
    });

    return customer;
  },

  async updateCustomer(
    shopId: string,
    id: string,
    userId: string,
    data: {
      customerName?: string;
      mobile?: string;
      email?: string;
      address?: string;
      gstNumber?: string;
      creditLimit?: number;
      notes?: string;
    }
  ): Promise<Customer> {
    const customer = await customerRepository.update(shopId, id, data);

    await activityLogRepository.log({
      shopId,
      userId,
      action: 'CUSTOMER_UPDATED',
      details: `Customer ${customer.customerName} updated successfully`,
    });

    return customer;
  },

  async deleteCustomer(shopId: string, id: string, userId: string): Promise<Customer> {
    const customer = await customerRepository.delete(shopId, id, userId);

    await activityLogRepository.log({
      shopId,
      userId,
      action: 'CUSTOMER_DELETED',
      details: `Customer ${customer.customerName} soft deleted`,
    });

    return customer;
  },
};
