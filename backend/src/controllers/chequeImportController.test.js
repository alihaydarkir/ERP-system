const ExcelJS = require('exceljs');

const mockCustomer = {
  findAll: jest.fn(),
  create: jest.fn()
};

const mockCheque = {
  findBySerialAndBank: jest.fn(),
  bulkCreate: jest.fn()
};

const mockChequeTransaction = {
  create: jest.fn()
};

const mockAuditLog = {
  create: jest.fn()
};

jest.mock('../models/Customer', () => mockCustomer);
jest.mock('../models/Cheque', () => ({ Cheque: mockCheque, ChequeTransaction: mockChequeTransaction }));
jest.mock('../models/AuditLog', () => mockAuditLog);

const { validateChequeImport, importCheques } = require('./chequeImportController');

const HEADERS = ['Seri No', 'Keşideci', 'Müşteri', 'Banka', 'Alınma Tarihi', 'Vade Tarihi', 'Tutar', 'Para Birimi'];

const makeFile = async (rows) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Çekler');
  ws.addRow(HEADERS);
  rows.forEach((r) => ws.addRow(r));
  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
};

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (file) => ({
  user: { id: 7, company_id: 42 },
  file,
  headers: {},
  socket: { remoteAddress: '127.0.0.1' }
});

const NEW_CUSTOMER_ROW = ['1234567', 'ABC Ltd.', 'Yeni Müşteri A.Ş.', 'Garanti', '05/11/2025', '05/12/2025', '50000', 'TRY'];

describe('chequeImportController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheque.findBySerialAndBank.mockResolvedValue(null);
  });

  test('müşteri araması ve mükerrer çek kontrolü yalnızca kullanıcının şirketinde yapılır', async () => {
    mockCustomer.findAll.mockResolvedValue([{ id: 5 }]);
    const res = makeRes();

    await validateChequeImport(makeReq(await makeFile([NEW_CUSTOMER_ROW])), res);

    expect(mockCustomer.findAll).toHaveBeenCalledWith({ company_id: 42, search: 'Yeni Müşteri A.Ş.' });
    expect(mockCheque.findBySerialAndBank).toHaveBeenCalledWith('1234567', 'Garanti', 42);
  });

  test('önizleme (validate) veritabanına müşteri yazmaz, oluşturulacak müşteriyi bildirir', async () => {
    mockCustomer.findAll.mockResolvedValue([]);
    const res = makeRes();

    await validateChequeImport(makeReq(await makeFile([NEW_CUSTOMER_ROW])), res);

    expect(mockCustomer.create).not.toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.validRows).toBe(1);
    expect(payload.data.errorRows).toBe(0);
    expect(payload.data.validData[0]).toMatchObject({ customer_id: null, new_customer: 'Yeni Müşteri A.Ş.', company_id: 42 });
  });

  test('import eksik müşteriyi company_id ile oluşturur ve çekleri company_id ile kaydeder', async () => {
    mockCustomer.findAll.mockResolvedValue([]);
    mockCustomer.create.mockResolvedValue({ id: 99 });
    mockCheque.bulkCreate.mockResolvedValue({ insertedCheques: [{ id: 1 }], errors: [] });
    const res = makeRes();

    await importCheques(makeReq(await makeFile([NEW_CUSTOMER_ROW])), res);

    expect(mockCustomer.create).toHaveBeenCalledWith(expect.objectContaining({ company_id: 42, company_name: 'Yeni Müşteri A.Ş.' }));
    expect(mockCheque.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({ customer_id: 99, company_id: 42, amount: 50000, due_date: '2025-12-05' })
    ]);
    expect(res.json.mock.calls[0][0].data.imported).toBe(1);
  });
});
