module 0x154f3ef7bf2886621959a2b118b95c99944b76af28e084755fe8391763613737::my_payment_system {

    use std::vector;
    use std::signer;
    use std::address;
    use std::coin;
    use 0x1::aptos_coin::AptosCoin;

    // Struct to represent a single payment
    struct Payment has copy, drop, store {
        payer: address,
        payee: address,
        amount: u64,
    }

    // Resource to track payment history
    struct PaymentHistory has store {
        payments: vector<Payment>,
    }

    // Initialize PaymentHistory
    public fun initialize_payment_history(account: &signer) {
        let payment_history = PaymentHistory {
            payments: vector::empty<Payment>(),
        };
        move_to(account, payment_history);
    }

    // Make a payment
    public fun make_payment(account: &signer, payee: address, amount: u64) {
        let sender = signer::address_of(account);
        let coin_store = AptosCoin::borrow_coin_store(account);
        AptosCoin::withdraw(account, amount);
        let payment = Payment {
            payer: sender,
            payee: payee,
            amount: amount,
        };
        let mut history = borrow_global_mut<PaymentHistory>(sender);
        vector::push_back(&mut history.payments, payment);
    }

    // Cancel a payment (dummy function for illustration)
    public fun cancel_payment(account: &signer, index: u64) {
        let sender = signer::address_of(account);
        let mut history = borrow_global_mut<PaymentHistory>(sender);
        vector::remove(&mut history.payments, index);
    }

    // Fetch PaymentHistory
    public fun get_payment_history(account: address): vector<Payment> {
        let history = borrow_global<PaymentHistory>(account);
        history.payments.clone()
    }

    // Resource Check
    public fun has_payment_history(account: address): bool {
        exists<PaymentHistory>(account)
    }

    // Helper function to check balance
    public fun get_balance(account: &signer): u64 {
        AptosCoin::borrow_balance(account)
    }
}


module 0x154f3ef7bf2886621959a2b118b95c99944b76af28e084755fe8391763613737::my_payment_system_tests {

    use std::signer;
    use std::vector;
    use 0x154f3ef7bf2886621959a2b118b95c99944b76af28e084755fe8391763613737::my_payment_system;
    use 0x1::aptos_coin::AptosCoin;

    public fun test_all(signer: &signer, payee: address, amount: u64, cancel_index: u64) {
        // Initialize PaymentHistory
        my_payment_system::initialize_payment_history(signer);

        // Verify that the PaymentHistory resource is created
        assert!(my_payment_system::has_payment_history(signer::address_of(signer)));

        // Make a payment
        let initial_balance = AptosCoin::borrow_balance(signer);
        my_payment_system::make_payment(signer, payee, amount);

        // Verify that the balance has been updated
        assert!(AptosCoin::borrow_balance(signer) == initial_balance - amount);

        // Verify the payment history
        let payments = my_payment_system::get_payment_history(signer::address_of(signer));
        assert!(payments.len() > 0);
        assert!(payments[0].payer == signer::address_of(signer));
        assert!(payments[0].payee == payee);
        assert!(payments[0].amount == amount);

        // Cancel a payment (only if history exists)
        if payments.len() > 0 {
            my_payment_system::cancel_payment(signer, cancel_index);
            
            let updated_history = my_payment_system::get_payment_history(signer::address_of(signer));
            assert!(updated_history.len() < payments.len());
        }

        // Verify the balance check
        let balance = my_payment_system::get_balance(signer);
        assert!(balance == AptosCoin::borrow_balance(signer));
    }
}
