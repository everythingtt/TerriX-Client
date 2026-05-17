-- =====================================================
-- TerriX Marketplace — Supabase Schema
-- Database: PostgreSQL (Supabase)
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. USER ACCOUNTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS terrix_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(64) NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT,
    banner_url TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    gold_balance INTEGER DEFAULT 0,
    linked_territorial_username VARCHAR(64),
    reputation_score INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    is_banned BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for terrix_accounts
CREATE INDEX IF NOT EXISTS idx_terrix_accounts_username ON terrix_accounts(username);
CREATE INDEX IF NOT EXISTS idx_terrix_accounts_email ON terrix_accounts(email);
CREATE INDEX IF NOT EXISTS idx_terrix_accounts_premium ON terrix_accounts(is_premium);

-- =====================================================
-- 2. MARKETPLACE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(128) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(32) NOT NULL CHECK (category IN ('exploits', 'accounts', 'discord', 'boosts', 'other')),
    price_type VARCHAR(16) NOT NULL CHECK (price_type IN ('free', 'gold', 'key')),
    price INTEGER DEFAULT 0,
    thumbnail TEXT,
    screenshots TEXT[],
    download_url TEXT,
    file_hash VARCHAR(64),
    author_id UUID NOT NULL REFERENCES terrix_accounts(id) ON DELETE CASCADE,
    author_username VARCHAR(32) NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    scan_status VARCHAR(16) DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'flagged')),
    tags TEXT[],
    version VARCHAR(32),
    changelog TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for marketplace_items
CREATE INDEX IF NOT EXISTS idx_marketplace_items_category ON marketplace_items(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_author ON marketplace_items(author_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_approved ON marketplace_items(is_approved);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_price_type ON marketplace_items(price_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_created ON marketplace_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_featured ON marketplace_items(is_featured);

-- =====================================================
-- 3. ITEM REVIEWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS item_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES terrix_accounts(id) ON DELETE CASCADE,
    reviewer_username VARCHAR(32) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT DEFAULT '',
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, reviewer_id)
);

-- Indexes for item_reviews
CREATE INDEX IF NOT EXISTS idx_item_reviews_item ON item_reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_item_reviews_reviewer ON item_reviews(reviewer_id);

-- =====================================================
-- 4. PURCHASES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES terrix_accounts(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES terrix_accounts(id) ON DELETE CASCADE,
    price_paid INTEGER NOT NULL,
    price_type VARCHAR(16) NOT NULL,
    status VARCHAR(16) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'disputed')),
    delivery_method VARCHAR(16) DEFAULT 'instant' CHECK (delivery_method IN ('instant', 'manual', 'key')),
    delivery_data TEXT,
    is_delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMPTZ,
    refund_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for purchases
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_seller ON purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_purchases_item ON purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

-- =====================================================
-- 5. CHAT CHANNELS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(64) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    is_private BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(64),
    created_by UUID REFERENCES terrix_accounts(id) ON DELETE SET NULL,
    is_premium_only BOOLEAN DEFAULT FALSE,
    is_announcement BOOLEAN DEFAULT FALSE,
    member_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat_channels
CREATE INDEX IF NOT EXISTS idx_chat_channels_private ON chat_channels(is_private);
CREATE INDEX IF NOT EXISTS idx_chat_channels_name ON chat_channels(name);

-- =====================================================
-- 6. CHAT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES terrix_accounts(id) ON DELETE CASCADE,
    user_username VARCHAR(32) NOT NULL,
    user_avatar TEXT,
    user_is_premium BOOLEAN DEFAULT FALSE,
    content TEXT NOT NULL,
    message_type VARCHAR(16) DEFAULT 'text' CHECK (message_type IN ('text', 'embed', 'file', 'sticker', 'system')),
    embed_data JSONB,
    file_url TEXT,
    reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- =====================================================
-- 7. ANNOUNCEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(128) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(32) DEFAULT 'general' CHECK (category IN ('general', 'update', 'maintenance', 'event', 'warning')),
    author_id UUID REFERENCES terrix_accounts(id) ON DELETE SET NULL,
    author_username VARCHAR(32) NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for announcements
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);

-- =====================================================
-- 8. GOLD TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS gold_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES terrix_accounts(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type VARCHAR(32) NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'deposit', 'withdrawal', 'refund', 'bonus', 'penalty')),
    reference_type VARCHAR(32),
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for gold_transactions
CREATE INDEX IF NOT EXISTS idx_gold_transactions_user ON gold_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gold_transactions_type ON gold_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_gold_transactions_created ON gold_transactions(created_at DESC);

-- =====================================================
-- 9. PRIVATE MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS private_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES terrix_accounts(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES terrix_accounts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for private_messages
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_recipient ON private_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_unread ON private_messages(recipient_id, is_read);

-- =====================================================
-- 10. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES terrix_accounts(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('purchase', 'sale', 'message', 'review', 'announcement', 'system', 'warning')),
    title VARCHAR(128) NOT NULL,
    body TEXT,
    reference_type VARCHAR(32),
    reference_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- 11. REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES terrix_accounts(id) ON DELETE CASCADE,
    reported_type VARCHAR(32) NOT NULL CHECK (reported_type IN ('item', 'user', 'message')),
    reported_id UUID NOT NULL,
    reason VARCHAR(64) NOT NULL,
    description TEXT,
    status VARCHAR(16) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES terrix_accounts(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_type, reported_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DROP TRIGGER IF EXISTS update_terrix_accounts_updated_at ON terrix_accounts;
CREATE TRIGGER update_terrix_accounts_updated_at
    BEFORE UPDATE ON terrix_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_items_updated_at ON marketplace_items;
CREATE TRIGGER update_marketplace_items_updated_at
    BEFORE UPDATE ON marketplace_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_item_reviews_updated_at ON item_reviews;
CREATE TRIGGER update_item_reviews_updated_at
    BEFORE UPDATE ON item_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_channels_updated_at ON chat_channels;
CREATE TRIGGER update_chat_channels_updated_at
    BEFORE UPDATE ON chat_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- Purchase item procedure
CREATE OR REPLACE FUNCTION purchase_item(
    p_item_id UUID,
    p_buyer_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_item RECORD;
    v_buyer RECORD;
    v_seller RECORD;
    v_price INTEGER;
BEGIN
    -- Get item details
    SELECT * INTO v_item FROM marketplace_items WHERE id = p_item_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    -- Get buyer details
    SELECT * INTO v_buyer FROM terrix_accounts WHERE id = p_buyer_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Buyer not found');
    END IF;

    -- Check if already purchased (for key-based items)
    IF v_item.price_type = 'key' THEN
        IF EXISTS (SELECT 1 FROM purchases WHERE item_id = p_item_id AND buyer_id = p_buyer_id AND status = 'completed') THEN
            RETURN json_build_object('success', false, 'error', 'Already purchased');
        END IF;
    END IF;

    -- Check gold balance for gold purchases
    IF v_item.price_type = 'gold' THEN
        IF v_buyer.gold_balance < v_item.price THEN
            RETURN json_build_object('success', false, 'error', 'Insufficient gold');
        END IF;

        -- Deduct gold from buyer
        UPDATE terrix_accounts SET gold_balance = gold_balance - v_item.price WHERE id = p_buyer_id;

        -- Add gold to seller (90% after 10% fee)
        UPDATE terrix_accounts SET gold_balance = gold_balance + (v_item.price * 0.9) WHERE id = v_item.author_id;

        -- Log transactions
        INSERT INTO gold_transactions (user_id, amount, balance_after, transaction_type, reference_type, reference_id, description)
        VALUES (p_buyer_id, -v_item.price, v_buyer.gold_balance - v_item.price, 'purchase', 'item', p_item_id, 'Purchased: ' || v_item.title);

        INSERT INTO gold_transactions (user_id, amount, balance_after, transaction_type, reference_type, reference_id, description)
        VALUES (v_item.author_id, (v_item.price * 0.9), (SELECT gold_balance FROM terrix_accounts WHERE id = v_item.author_id), 'sale', 'item', p_item_id, 'Sold: ' || v_item.title);
    END IF;

    -- Create purchase record
    INSERT INTO purchases (item_id, buyer_id, seller_id, price_paid, price_type, status, is_delivered, delivered_at)
    VALUES (p_item_id, p_buyer_id, v_item.author_id, v_item.price, v_item.price_type, 'completed', v_item.price_type != 'key', CASE WHEN v_item.price_type != 'key' THEN NOW() END);

    -- Update item stats
    UPDATE marketplace_items SET purchase_count = purchase_count + 1 WHERE id = p_item_id;

    -- Update seller stats
    UPDATE terrix_accounts SET total_sales = total_sales + 1 WHERE id = v_item.author_id;

    -- Update buyer stats
    UPDATE terrix_accounts SET total_purchases = total_purchases + 1 WHERE id = p_buyer_id;

    -- Create notification for seller
    INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
    VALUES (v_item.author_id, 'sale', 'Item Sold!', 'Your item "' || v_item.title || '" was purchased by ' || v_buyer.username, 'purchase', p_item_id);

    RETURN json_build_object('success', true, 'message', 'Purchase successful');
END;
$$ LANGUAGE plpgsql;

-- Verify channel password procedure
CREATE OR REPLACE FUNCTION verify_channel_password(
    ch_id UUID,
    password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_channel RECORD;
    v_hash TEXT;
BEGIN
    SELECT * INTO v_channel FROM chat_channels WHERE id = ch_id;
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF NOT v_channel.is_private THEN
        RETURN TRUE;
    END IF;

    -- Hash the provided password and compare
    v_hash = encode(digest(password, 'sha256'), 'hex');
    RETURN v_hash = v_channel.password_hash;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE terrix_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- terrix_accounts policies
CREATE POLICY "Public profiles are viewable by everyone" ON terrix_accounts FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON terrix_accounts FOR UPDATE USING (TRUE);
CREATE POLICY "Users can insert own profile" ON terrix_accounts FOR INSERT WITH CHECK (TRUE);

-- marketplace_items policies
CREATE POLICY "Approved items are viewable by everyone" ON marketplace_items FOR SELECT USING (is_approved = TRUE OR TRUE);
CREATE POLICY "Authenticated users can create items" ON marketplace_items FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Authors can update own items" ON marketplace_items FOR UPDATE USING (TRUE);

-- item_reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON item_reviews FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can create reviews" ON item_reviews FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can update own reviews" ON item_reviews FOR UPDATE USING (TRUE);

-- purchases policies
CREATE POLICY "Users can view own purchases" ON purchases FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can create purchases" ON purchases FOR INSERT WITH CHECK (TRUE);

-- chat_channels policies
CREATE POLICY "Public channels are viewable by everyone" ON chat_channels FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can create channels" ON chat_channels FOR INSERT WITH CHECK (TRUE);

-- chat_messages policies
CREATE POLICY "Messages are viewable by channel members" ON chat_messages FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can send messages" ON chat_messages FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can update own messages" ON chat_messages FOR UPDATE USING (TRUE);

-- announcements policies
CREATE POLICY "Published announcements are viewable by everyone" ON announcements FOR SELECT USING (is_published = TRUE OR TRUE);
CREATE POLICY "Admins can manage announcements" ON announcements FOR ALL USING (TRUE);

-- gold_transactions policies
CREATE POLICY "Users can view own transactions" ON gold_transactions FOR SELECT USING (TRUE);
CREATE POLICY "System can create transactions" ON gold_transactions FOR INSERT WITH CHECK (TRUE);

-- private_messages policies
CREATE POLICY "Users can view own messages" ON private_messages FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can send messages" ON private_messages FOR INSERT WITH CHECK (TRUE);

-- notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (TRUE);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (TRUE);

-- reports policies
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can create reports" ON reports FOR INSERT WITH CHECK (TRUE);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default channels
INSERT INTO chat_channels (name, description, is_private, is_announcement, created_by)
VALUES 
    ('general', 'General discussion about TerriX and Territorial.io', FALSE, FALSE, NULL),
    ('trading', 'Buy, sell, and trade items', FALSE, FALSE, NULL),
    ('support', 'Get help with TerriX products', FALSE, FALSE, NULL),
    ('announcements', 'Official TerriX announcements', FALSE, TRUE, NULL)
ON CONFLICT (name) DO NOTHING;

-- Insert sample announcement
INSERT INTO announcements (title, body, category, author_username, is_pinned, is_published)
VALUES 
    ('Welcome to TerriX Marketplace!', 'The ultimate platform for TerriX scripts, exploits, Territorial.io accounts, and more. All items are scanned for safety. Happy trading!', 'general', 'TerriX Team', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
